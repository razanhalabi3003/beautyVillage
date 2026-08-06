import Joi from "joi";

// role/email/password/refreshTokens/isActive are deliberately not declared
// here, and .unknown(false) rejects any field that isn't explicitly listed -
// this is what actually stops a user from changing their own role.
export const updateProfileSchema = Joi.object({
    name: Joi.string().min(2).max(50),
    phone: Joi.string().pattern(/^0\d{8,9}$/).messages({
        "string.pattern.base": "phone must be a valid phone number",
    }),
    avatar: Joi.string().max(300),
}).min(1).unknown(false);

export const adminStatusSchema = Joi.object({
    isActive: Joi.boolean().required(),
}).unknown(false);
