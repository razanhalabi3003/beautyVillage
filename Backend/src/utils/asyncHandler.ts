import { Request, Response, NextFunction, RequestHandler } from "express";

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

// Wraps an async controller method so a rejected promise (a thrown error)
// is forwarded to next(err) instead of crashing the request unhandled.
// Intended for new controllers only (Stage 4+) - existing Posts/Comments/Auth
// controllers keep their current try/catch.
const asyncHandler = (handler: AsyncRouteHandler): RequestHandler => {
    return (req, res, next) => {
        handler(req, res, next).catch(next);
    };
};

export default asyncHandler;
