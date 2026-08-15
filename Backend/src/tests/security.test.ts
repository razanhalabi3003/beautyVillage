import request from "supertest";
import initApp from "../server";
import mongoose from "mongoose";
import { Express } from "express";

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
    test("normal login attempts still work under the limit", async () => {
        const response = await request(app)
            .post("/auth/login")
            .send({ email: "nobody@example.com", password: "wrongpassword" });
        expect(response.statusCode).not.toBe(429);
    });

    test("returns 429 after exceeding the auth attempt cap", async () => {
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
