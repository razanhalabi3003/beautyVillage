import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import userModel from "../models/user_model";
import { UserRole } from "../types/express";

type TokenPayload = {
    _id: string;
};

// Lets a route work for guests while still identifying a logged-in user when
// a valid token is supplied. A MISSING token is not an error here - only a
// token that IS supplied but turns out to be invalid, expired, for a deleted
// user, or for a suspended user is rejected, exactly like authMiddleware
// would reject it. A bad token is never silently treated as "just a guest".
export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        next();
        return;
    }

    if (!process.env.TOKEN_SECRET) {
        res.status(400).send("missing auth configuration");
        return;
    }

    jwt.verify(token, process.env.TOKEN_SECRET, async (err, data) => {
        if (err) {
            res.status(403).send("invalid token");
            return;
        }
        const payload = data as TokenPayload;
        try {
            const user = await userModel.findById(payload._id).select("role isActive");
            if (!user) {
                res.status(401).send("user not found");
                return;
            }
            if (user.isActive === false) {
                res.status(403).send("account is suspended");
                return;
            }
            req.user = {
                id: user._id.toString(),
                role: (user.role as UserRole) || "customer",
            };
            next();
        } catch (error) {
            next(error);
        }
    });
};
