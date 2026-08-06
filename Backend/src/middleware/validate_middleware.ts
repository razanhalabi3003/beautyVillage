import { Request, Response, NextFunction } from "express";
import { ObjectSchema } from "joi";

interface ValidationAppError extends Error {
    statusCode?: number;
    errors?: string[];
}

// Validates req.body against a JOI schema. On failure it never responds
// directly - it forwards a structured error to next(err), which the global
// error middleware turns into the standard { success, message, errors } shape.
export const validate = (schema: ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const { error } = schema.validate(req.body, { abortEarly: false });
        if (error) {
            const validationError: ValidationAppError = new Error("Validation failed");
            validationError.name = "JoiValidationError";
            validationError.statusCode = 400;
            validationError.errors = error.details.map((detail) => detail.message.replace(/"/g, ""));
            next(validationError);
            return;
        }
        next();
    };
};
