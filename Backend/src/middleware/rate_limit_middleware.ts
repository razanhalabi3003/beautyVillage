import rateLimit from "express-rate-limit";

// Jest sets NODE_ENV to "test" by default, so the automated suite never
// trips these limits. A dedicated security test temporarily overrides
// NODE_ENV to prove the real limits work in production.
const isTestEnv = () => process.env.NODE_ENV === "test";

export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    skip: isTestEnv,
});

// Separate from registerLimiter so normal registration activity can never
// count against - or be blocked by - a user's login attempts, or vice versa.
// skipSuccessfulRequests means only failed login attempts consume the quota:
// switching between several accounts and logging in/out repeatedly must
// never lock a user out of a correct login.
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skip: isTestEnv,
    skipSuccessfulRequests: true,
    message: { message: "Too many attempts, please try again later" },
});

export const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skip: isTestEnv,
    message: { message: "Too many attempts, please try again later" },
});
