import Joi from "joi";

// slug is deliberately not accepted here - it is always derived server-side
// from name, never taken from the client.
export const createCategorySchema = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    image: Joi.string().max(300),
}).unknown(false);

// isActive is optional here so an admin can reactivate a category they
// previously deactivated (DELETE only ever sets isActive:false, there is no
// separate reactivate route - this update endpoint doubles as that path,
// same pattern as the service reactivation fix in Stage 12).
export const updateCategorySchema = Joi.object({
    name: Joi.string().min(2).max(50),
    image: Joi.string().max(300),
    isActive: Joi.boolean(),
}).min(1).unknown(false);
