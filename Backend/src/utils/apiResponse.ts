import { Response } from "express";

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

// Success response for a single object. Intended for new endpoints only -
// existing Posts/Comments/Auth responses are left as they are.
export const sendSuccess = (res: Response, data: unknown, statusCode = 200): void => {
    res.status(statusCode).json({
        success: true,
        data,
    });
};

// Success response for a list, including pagination info.
export const sendList = (res: Response, data: unknown[], pagination: Pagination, statusCode = 200): void => {
    res.status(statusCode).json({
        success: true,
        data,
        pagination,
    });
};
