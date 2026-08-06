import { Request, Response, NextFunction } from "express";
import userModel from "../models/user_model";
import { sendSuccess, sendList } from "../utils/apiResponse";

const SAFE_FIELDS = "-password -refreshTokens";

const list = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = Math.max(parseInt(req.query.page as string) || 1, 1);
        const limit = Math.max(parseInt(req.query.limit as string) || 20, 1);
        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            userModel.find().select(SAFE_FIELDS).skip(skip).limit(limit),
            userModel.countDocuments(),
        ]);

        sendList(res, users, {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        next(error);
    }
};

const getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: "Unauthorized", errors: [] });
            return;
        }
        const isSelf = req.params.id === req.user.id;
        const isAdmin = req.user.role === "admin";
        if (!isSelf && !isAdmin) {
            res.status(403).json({ success: false, message: "Forbidden", errors: [] });
            return;
        }
        const user = await userModel.findById(req.params.id).select(SAFE_FIELDS);
        if (!user) {
            res.status(404).json({ success: false, message: "User not found", errors: [] });
            return;
        }
        sendSuccess(res, user);
    } catch (error) {
        next(error);
    }
};

const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: "Unauthorized", errors: [] });
            return;
        }
        if (req.params.id !== req.user.id) {
            res.status(403).json({ success: false, message: "Forbidden", errors: [] });
            return;
        }
        // req.body only ever contains name/phone/avatar here - enforced by
        // updateProfileSchema (unknown(false)) on the route before this runs.
        const user = await userModel.findByIdAndUpdate(
            req.user.id,
            { $set: req.body },
            { new: true, runValidators: true }
        ).select(SAFE_FIELDS);
        if (!user) {
            res.status(404).json({ success: false, message: "User not found", errors: [] });
            return;
        }
        sendSuccess(res, user);
    } catch (error) {
        next(error);
    }
};

const updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // req.body only ever contains isActive here - enforced by
        // adminStatusSchema (unknown(false)) on the route before this runs.
        const user = await userModel.findByIdAndUpdate(
            req.params.id,
            { $set: { isActive: req.body.isActive } },
            { new: true, runValidators: true }
        ).select(SAFE_FIELDS);
        if (!user) {
            res.status(404).json({ success: false, message: "User not found", errors: [] });
            return;
        }
        sendSuccess(res, user);
    } catch (error) {
        next(error);
    }
};

export default { list, getById, updateProfile, updateStatus };
