import { Request, Response } from "express";

// Registered after all routes; catches any request that didn't match one.
const notFoundMiddleware = (req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
};

export default notFoundMiddleware;
