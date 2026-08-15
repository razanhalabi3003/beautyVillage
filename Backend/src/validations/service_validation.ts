import Joi from "joi";

// isActive is deliberately not accepted here - it is always hardcoded on
// create, and deactivation only ever happens through DELETE.
export const createServiceSchema = Joi.object({
    business: Joi.string().hex().length(24).required(),
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().max(1000),
    price: Joi.number().min(0).required(),
    durationMinutes: Joi.number().integer().min(5).required(),
}).unknown(false);

// business cannot be reassigned through an update - only content fields,
// plus isActive so the owner can reactivate a service they previously
// deactivated (DELETE only ever sets isActive:false, there is no separate
// reactivate route - this update endpoint doubles as that path).
export const updateServiceSchema = Joi.object({
    name: Joi.string().min(2).max(100),
    description: Joi.string().max(1000),
    price: Joi.number().min(0),
    durationMinutes: Joi.number().integer().min(5),
    isActive: Joi.boolean(),
}).min(1).unknown(false);
