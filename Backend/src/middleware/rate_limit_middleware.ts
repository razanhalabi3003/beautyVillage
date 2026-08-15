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

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skip: isTestEnv,
    message: { message: "Too many attempts, please try again later" },
});
