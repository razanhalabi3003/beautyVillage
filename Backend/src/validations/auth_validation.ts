import Joi from "joi";

// role/isActive/refreshTokens are deliberately not declared here, and
// .unknown(false) rejects any field that isn't explicitly listed below -
// this is what actually stops a client from injecting role: "admin".
export const registerSchema = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(128).required(),
    phone: Joi.string().pattern(/^0\d{8,9}$/).messages({
        "string.pattern.base": "phone must be a valid phone number",
    }),
}).unknown(false);

export const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
}).unknown(false);
