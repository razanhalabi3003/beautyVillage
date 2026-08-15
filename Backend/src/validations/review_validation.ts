import Joi from "joi";

// customer/business/isVisible are deliberately not declared here - they are
// always server-controlled, and .unknown(false) rejects any attempt to send them.
export const createReviewSchema = Joi.object({
    appointment: Joi.string().hex().length(24).required(),
    rating: Joi.number().integer().min(1).max(5).required(),
    comment: Joi.string().max(500),
}).unknown(false);

export const visibilitySchema = Joi.object({
    isVisible: Joi.boolean().required(),
}).unknown(false);
