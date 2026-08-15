import { Request, Response, NextFunction } from "express";

interface AppError extends Error {
    statusCode?: number;
}

// Global error handler. Must keep all four arguments (err, req, res, next)
// so Express recognizes this as error-handling middleware.
const errorMiddleware = (err: AppError, req: Request, res: Response, next: NextFunction) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal server error";
    const errors: string[] = [];

    // Mongoose: invalid ObjectId (e.g. GET /businesses/not-a-real-id)
    if (err.name === "CastError") {
        statusCode = 400;
        message = "Invalid ID format";
    }

    // Mongoose: duplicate key (e.g. unique email, unique Business.owner)
    if ((err as { code?: number }).code === 11000) {
        statusCode = 400;
        message = "Duplicate value, this record already exists";
    }

    // Mongoose: schema validation error
    if (err.name === "ValidationError") {
        statusCode = 400;
        message = "Validation error";
        const validationErrors = (err as unknown as { errors: Record<string, { message: string }> }).errors;
        errors.push(...Object.values(validationErrors).map((e) => e.message));
    }

    // JOI: request body failed schema validation (see validate_middleware.ts)
    if (err.name === "JoiValidationError") {
        statusCode = 400;
        message = "Validation failed";
        const joiErrors = (err as { errors?: string[] }).errors;
        if (joiErrors) {
            errors.push(...joiErrors);
        }
    }

    // Multer: file too large, wrong upload field name, too many files, etc.
    // (fileFilter rejections already carry their own statusCode via err.statusCode above.)
    if (err.name === "MulterError") {
        statusCode = 400;
        message = err.message || "Invalid file upload";
    }

    if (process.env.NODE_ENV !== "production") {
        console.error(err);
    }

    res.status(statusCode).json({
        success: false,
        message,
        errors,
    });
};

export default errorMiddleware;
