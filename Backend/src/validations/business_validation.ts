import Joi from "joi";

// Matches "HH:mm" for 00:00 through 23:59 only.
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const workingHourEntry = Joi.object({
    day: Joi.number().integer().min(0).max(6).required(),
    isOpen: Joi.boolean().required(),
    startTime: Joi.string().pattern(timePattern).when("isOpen", {
        is: true,
        then: Joi.required(),
        otherwise: Joi.optional(),
    }),
    endTime: Joi.string().pattern(timePattern).when("isOpen", {
        is: true,
        then: Joi.required(),
        otherwise: Joi.optional(),
    }),
}).unknown(false);

const workingHoursSchema = Joi.array().items(workingHourEntry).custom((value: { day: number; isOpen: boolean; startTime?: string; endTime?: string }[], helpers) => {
    const seenDays = new Set<number>();
    for (const entry of value) {
        if (seenDays.has(entry.day)) {
            return helpers.error("workingHours.duplicateDay");
        }
        seenDays.add(entry.day);

        if (entry.isOpen && entry.endTime !== undefined && entry.startTime !== undefined && entry.endTime <= entry.startTime) {
            return helpers.error("workingHours.invalidRange");
        }
    }
    return value;
}).messages({
    "workingHours.duplicateDay": "workingHours cannot contain duplicate day entries",
    "workingHours.invalidRange": "endTime must be later than startTime for open days",
});

// owner/approvalStatus/rejectionReason/isActive/averageRating/reviewCount are
// deliberately not declared here - they are always server-controlled, and
// .unknown(false) rejects any attempt to send them.
export const createBusinessSchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().min(10).max(2000).required(),
    category: Joi.string().hex().length(24).required(),
    address: Joi.string().min(5).max(200).required(),
    phone: Joi.string().pattern(/^0\d{8,9}$/).required(),
    workingHours: workingHoursSchema.required(),
}).unknown(false);

export const updateBusinessSchema = Joi.object({
    name: Joi.string().min(2).max(100),
    description: Joi.string().min(10).max(2000),
    category: Joi.string().hex().length(24),
    address: Joi.string().min(5).max(200),
    phone: Joi.string().pattern(/^0\d{8,9}$/),
    workingHours: workingHoursSchema,
}).min(1).unknown(false);

export const rejectBusinessSchema = Joi.object({
    rejectionReason: Joi.string().min(3).max(500).required(),
}).unknown(false);

export const suspendBusinessSchema = Joi.object({
    isActive: Joi.boolean().required(),
}).unknown(false);
