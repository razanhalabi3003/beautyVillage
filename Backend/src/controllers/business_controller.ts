import { Request, Response } from "express";
import mongoose from "mongoose";
import businessModel from "../models/business_model";
import categoryModel from "../models/category_model";
import userModel from "../models/user_model";
import asyncHandler from "../utils/asyncHandler";
import { sendSuccess, sendList } from "../utils/apiResponse";

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 12;

interface AppError extends Error {
    statusCode?: number;
}

const createError = (message: string, statusCode: number): AppError => {
    const error: AppError = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const list = asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || DEFAULT_LIMIT, 1), MAX_LIMIT);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
        approvalStatus: "approved",
        isActive: true,
    };

    if (req.query.search) {
        filter.name = { $regex: req.query.search as string, $options: "i" };
    }

    if (req.query.category) {
        const categoryId = req.query.category as string;
        // An invalid id can never match a real business, so this returns an
        // empty result instead of letting Mongoose throw a CastError.
        filter.category = mongoose.isValidObjectId(categoryId) ? categoryId : null;
    }

    const sort: Record<string, 1 | -1> =
        req.query.sort === "rating" ? { averageRating: -1 } : { createdAt: -1 };

    const [businesses, total] = await Promise.all([
        businessModel.find(filter)
            .select("-owner")
            .populate("category", "name slug")
            .sort(sort)
            .skip(skip)
            .limit(limit),
        businessModel.countDocuments(filter),
    ]);

    sendList(res, businesses, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
    });
});

const getMine = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized", errors: [] });
        return;
    }
    // null when the user has no business yet - a normal state, not an error.
    const business = await businessModel.findOne({ owner: req.user.id })
        .populate("category", "name slug");
    sendSuccess(res, business);
});

const getPending = asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || DEFAULT_LIMIT, 1), MAX_LIMIT);
    const skip = (page - 1) * limit;

    const filter = { approvalStatus: "pending" };

    const [businesses, total] = await Promise.all([
        businessModel.find(filter)
            .populate("category", "name slug")
            .populate("owner", "name email")
            .sort({ createdAt: 1 })
            .skip(skip)
            .limit(limit),
        businessModel.countDocuments(filter),
    ]);

    sendList(res, businesses, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
    });
});

// Admin-only, general-purpose listing across every approvalStatus - unlike
// getPending (which is hardcoded to "pending" and predates this), this
// accepts an optional status filter and returns everything when omitted.
const listForAdmin = asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || DEFAULT_LIMIT, 1), MAX_LIMIT);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (["pending", "approved", "rejected"].includes(req.query.status as string)) {
        filter.approvalStatus = req.query.status;
    }

    // Never populate password/refreshTokens - only safe owner fields.
    const [businesses, total] = await Promise.all([
        businessModel.find(filter)
            .populate("owner", "name email")
            .populate("category", "name slug")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        businessModel.countDocuments(filter),
    ]);

    sendList(res, businesses, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
    });
});

const getById = asyncHandler(async (req: Request, res: Response) => {
    const business = await businessModel.findById(req.params.id)
        .populate("category", "name slug");

    if (!business) {
        res.status(404).json({ success: false, message: "Business not found", errors: [] });
        return;
    }

    const isPublic = business.approvalStatus === "approved" && business.isActive === true;
    const isOwner = !!req.user && business.owner.toString() === req.user.id;
    const isAdmin = !!req.user && req.user.role === "admin";

    // Anything not public is treated as not found for anyone who isn't the
    // owner or an admin - this avoids revealing that a private business
    // exists at all to an unrelated caller.
    if (!isPublic && !isOwner && !isAdmin) {
        res.status(404).json({ success: false, message: "Business not found", errors: [] });
        return;
    }

    sendSuccess(res, business);
});

const create = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized", errors: [] });
        return;
    }

    const existing = await businessModel.findOne({ owner: req.user.id });
    if (existing) {
        res.status(400).json({
            success: false,
            message: "You have already submitted a business",
            errors: [],
        });
        return;
    }

    const category = await categoryModel.findById(req.body.category);
    if (!category || !category.isActive) {
        res.status(400).json({
            success: false,
            message: "Selected category does not exist or is not active",
            errors: [],
        });
        return;
    }

    // owner/approvalStatus/isActive/averageRating/reviewCount are always
    // server-controlled here - never taken from req.body, even though JOI
    // already rejects those keys before this code runs.
    const business = await businessModel.create({
        owner: req.user.id,
        name: req.body.name,
        description: req.body.description,
        category: req.body.category,
        address: req.body.address,
        phone: req.body.phone,
        workingHours: req.body.workingHours,
        approvalStatus: "pending",
        isActive: true,
        averageRating: 0,
        reviewCount: 0,
    });

    sendSuccess(res, business, 201);
});

const update = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized", errors: [] });
        return;
    }

    const business = await businessModel.findById(req.params.id);
    if (!business) {
        res.status(404).json({ success: false, message: "Business not found", errors: [] });
        return;
    }

    // Ownership check - this is also what keeps admin out of this endpoint,
    // since an admin's id can never equal a business's owner.
    if (business.owner.toString() !== req.user.id) {
        res.status(403).json({ success: false, message: "Forbidden", errors: [] });
        return;
    }

    if (req.body.category) {
        const category = await categoryModel.findById(req.body.category);
        if (!category || !category.isActive) {
            res.status(400).json({
                success: false,
                message: "Selected category does not exist or is not active",
                errors: [],
            });
            return;
        }
    }

    // req.body only ever contains name/description/category/address/phone/
    // workingHours here - enforced by updateBusinessSchema (unknown(false)).
    Object.assign(business, req.body);

    // Editing a rejected business is treated as a resubmission.
    if (business.approvalStatus === "rejected") {
        business.approvalStatus = "pending";
        business.rejectionReason = undefined;
    }

    await business.save();
    sendSuccess(res, business);
});

const approve = asyncHandler(async (req: Request, res: Response) => {
    const business = await businessModel.findById(req.params.id);
    if (!business) {
        res.status(404).json({ success: false, message: "Business not found", errors: [] });
        return;
    }

    if (business.approvalStatus !== "pending") {
        res.status(400).json({
            success: false,
            message: "Only a pending business can be approved",
            errors: [],
        });
        return;
    }

    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            const owner = await userModel.findById(business.owner).session(session);
            if (!owner) {
                throw createError("Business owner no longer exists", 400);
            }

            business.approvalStatus = "approved";
            business.isActive = true;
            business.rejectionReason = undefined;
            await business.save({ session });

            // Only the role field is touched - no other user field is read
            // or written here.
            owner.role = "businessOwner";
            await owner.save({ session });
        });
    } finally {
        await session.endSession();
    }

    sendSuccess(res, business);
});

const reject = asyncHandler(async (req: Request, res: Response) => {
    const business = await businessModel.findById(req.params.id);
    if (!business) {
        res.status(404).json({ success: false, message: "Business not found", errors: [] });
        return;
    }

    if (business.approvalStatus !== "pending") {
        res.status(400).json({
            success: false,
            message: "Only a pending business can be rejected",
            errors: [],
        });
        return;
    }

    business.approvalStatus = "rejected";
    business.rejectionReason = req.body.rejectionReason;
    await business.save();

    sendSuccess(res, business);
});

const suspend = asyncHandler(async (req: Request, res: Response) => {
    // Bidirectional: isActive:false suspends, isActive:true reactivates.
    // approvalStatus is never touched here.
    const business = await businessModel.findByIdAndUpdate(
        req.params.id,
        { $set: { isActive: req.body.isActive } },
        { new: true, runValidators: true }
    );
    if (!business) {
        res.status(404).json({ success: false, message: "Business not found", errors: [] });
        return;
    }
    sendSuccess(res, business);
});

export default { list, getMine, getPending, listForAdmin, getById, create, update, approve, reject, suspend };
