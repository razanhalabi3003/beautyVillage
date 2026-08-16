import request from "supertest";
import initApp from "../server";
import mongoose from "mongoose";
import { Express } from "express";

// Real Atlas round-trips + bcrypt hashing can exceed Jest's 5s default,
// same reasoning as every other suite in this project.
jest.setTimeout(30000);

let app: Express;

beforeAll(async () => {
    app = await initApp();
});

afterAll(async () => {
    await mongoose.connection.close();
});

// Jest sets NODE_ENV="test" by default, which the rate limiters use to skip
// themselves so the rest of the suite never trips them. Temporarily setting
// NODE_ENV to something else proves the real production limits actually work.
const withRateLimitEnabled = async (fn: () => Promise<void>) => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = "rate-limit-check";
    try {
        await fn();
    } finally {
        process.env.NODE_ENV = original;
    }
};

describe("Security headers", () => {
    test("Helmet headers are present on a normal response", async () => {
        const response = await request(app).get("/health");
        expect(response.headers["x-content-type-options"]).toBe("nosniff");
        expect(response.headers["x-dns-prefetch-control"]).toBeDefined();
        expect(response.headers["x-powered-by"]).toBeUndefined();
    });
});

describe("General API rate limiting", () => {
    test("is skipped during the automated test run (NODE_ENV=test)", async () => {
        const response = await request(app).get("/categories");
        expect(response.headers["ratelimit-limit"]).toBeUndefined();
    });

    test("applies rate-limit headers when active", async () => {
        await withRateLimitEnabled(async () => {
            const response = await request(app).get("/categories");
            expect(response.headers["ratelimit-limit"]).toBeDefined();
        });
    });
});

describe("Auth rate limiting", () => {
    // Order matters in this describe block: the login limiter's in-memory
    // counter persists across tests in this file, and once it trips it stays
    // tripped for the rest of the run. Tests that expect a successful login
    // must run before the test that deliberately exhausts the limiter.
    const loginCredentials = {
        name: "Security Rate Limit User",
        email: `security-ratelimit-${Date.now()}@example.com`,
        password: "123456",
    };

    beforeAll(async () => {
        await request(app).post("/auth/register").send(loginCredentials);
    });

    test("normal login attempts still work under the limit", async () => {
        const response = await request(app)
            .post("/auth/login")
            .send({ email: "nobody@example.com", password: "wrongpassword" });
        expect(response.statusCode).not.toBe(429);
    });

    test("repeated successful logins never consume the quota, and login still works afterward", async () => {
        await withRateLimitEnabled(async () => {
            for (let i = 0; i < 15; i++) {
                const response = await request(app)
                    .post("/auth/login")
                    .send({ email: loginCredentials.email, password: loginCredentials.password });
                expect(response.statusCode).toBe(200);
            }
        });
    });

    test("login and register are rate-limited independently", async () => {
        await withRateLimitEnabled(async () => {
            for (let i = 0; i < 10; i++) {
                await request(app)
                    .post("/auth/register")
                    .send({ name: "Flood", email: `flood-${Date.now()}-${i}@example.com`, password: "123456" });
            }
            const registerResponse = await request(app)
                .post("/auth/register")
                .send({ name: "Flood", email: `flood-${Date.now()}-final@example.com`, password: "123456" });
            expect(registerResponse.statusCode).toBe(429);

            // Exhausting the register limiter must not affect login.
            const loginResponse = await request(app)
                .post("/auth/login")
                .send({ email: loginCredentials.email, password: loginCredentials.password });
            expect(loginResponse.statusCode).toBe(200);
        });
    });

    test("repeated failed logins eventually trigger 429", async () => {
        await withRateLimitEnabled(async () => {
            let lastStatus = 0;
            for (let i = 0; i < 11; i++) {
                const response = await request(app)
                    .post("/auth/login")
                    .send({ email: "nobody@example.com", password: "wrongpassword" });
                lastStatus = response.statusCode;
            }
            expect(lastStatus).toBe(429);
        });
    });
});

describe("/health availability", () => {
    test("stays reachable and is never rate-limited", async () => {
        await withRateLimitEnabled(async () => {
            for (let i = 0; i < 5; i++) {
                const response = await request(app).get("/health");
                expect(response.statusCode).not.toBe(429);
            }
        });
    });
});
