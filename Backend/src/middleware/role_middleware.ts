import { Request, Response, NextFunction } from "express";
import { UserRole } from "../types/express";

// Must run after authMiddleware, which is what actually sets req.user from
// the database. Role is only ever read from req.user - never from req.body.
export const authorize = (...roles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                message: "Forbidden",
                errors: [],
            });
            return;
        }
        next();
    };
};
