import Joi from "joi";

// customer/endDateTime/status are deliberately not declared here - they are
// always server-controlled, and .unknown(false) rejects any attempt to send them.
export const createAppointmentSchema = Joi.object({
    business: Joi.string().hex().length(24).required(),
    service: Joi.string().hex().length(24).required(),
    startDateTime: Joi.date().iso().required(),
    customerNote: Joi.string().max(500),
}).unknown(false);

// "cancelled" is deliberately excluded - cancellation only ever happens
// through the separate /cancel endpoint, never through this one.
export const ownerStatusUpdateSchema = Joi.object({
    status: Joi.string().valid("confirmed", "rejected", "completed").required(),
}).unknown(false);

export const cancelAppointmentSchema = Joi.object({
    cancellationReason: Joi.string().max(500),
}).unknown(false);
