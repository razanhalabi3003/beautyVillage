import { Request, Response } from "express";
import mongoose from "mongoose";
import appointmentModel from "../models/appointment_model";
import businessModel from "../models/business_model";
import reviewModel from "../models/review_model";
import asyncHandler from "../utils/asyncHandler";
import { sendSuccess, sendList } from "../utils/apiResponse";
import { canViewBusiness } from "../utils/businessVisibility";
import { recalculateBusinessRating } from "../utils/ratingUtils";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const create = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized", errors: [] });
        return;
    }
    const userId = req.user.id;

    const appointment = await appointmentModel.findById(req.body.appointment);
    if (!appointment) {
        res.status(404).json({ success: false, message: "Appointment not found", errors: [] });
        return;
    }

    if (appointment.customer.toString() !== userId) {
        res.status(403).json({ success: false, message: "Forbidden", errors: [] });
        return;
    }

    if (appointment.status !== "completed") {
        res.status(400).json({
            success: false,
            message: "You can only review a completed appointment",
            errors: [],
        });
        return;
    }

    // Readable pre-check; the unique index on Review.appointment is the
    // race-condition safety net below.
    const existingReview = await reviewModel.findOne({ appointment: appointment._id });
    if (existingReview) {
        res.status(400).json({ success: false, message: "This appointment has already been reviewed", errors: [] });
        return;
    }

    const business = await businessModel.findById(appointment.business);
    if (!business) {
        res.status(404).json({ success: false, message: "Business not found", errors: [] });
        return;
    }

    // Deliberately no approved/active check here - eligibility is based on
    // the historical completed appointment, not the business's current
    // status (e.g. a later-suspended business can still be reviewed for a
    // completed appointment that happened while it was active).

    // Defensive: booking already prevents an owner from booking their own
    // business, but this guards against any future inconsistent data.
    if (business.owner.toString() === userId) {
        res.status(403).json({ success: false, message: "You cannot review your own business", errors: [] });
        return;
    }

    const businessIdStr = business._id.toString();
    let review;

    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            const created = await reviewModel.create([{
                customer: userId,
                business: business._id,
                appointment: appointment._id,
                rating: req.body.rating,
                comment: req.body.comment,
            }], { session });
            review = created[0];

            await recalculateBusinessRating(businessIdStr, session);
        });
    } finally {
        await session.endSession();
    }

    sendSuccess(res, review, 201);
});

const listMine = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized", errors: [] });
        return;
    }

    // Unlike listByBusiness's public isVisible:true filter, this always
    // includes the user's own hidden reviews too - a review they wrote still
    // "exists" for them (e.g. for reviewed-appointment UI state) even after
    // an admin has hidden it from public view.
    const reviews = await reviewModel
        .find({ customer: req.user.id })
        .select("appointment business rating comment isVisible createdAt")
        .sort({ createdAt: -1 });

    sendList(res, reviews, {
        page: 1,
        limit: reviews.length,
        total: reviews.length,
        totalPages: 1,
    });
});

const listByBusiness = asyncHandler(async (req: Request, res: Response) => {
    const business = await businessModel.findById(req.params.businessId);
    if (!business) {
        res.status(404).json({ success: false, message: "Business not found", errors: [] });
        return;
    }

    if (!canViewBusiness(business, req.user)) {
        res.status(404).json({ success: false, message: "Business not found", errors: [] });
        return;
    }

    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || DEFAULT_LIMIT, 1), MAX_LIMIT);
    const skip = (page - 1) * limit;

    // Always isVisible:true here, regardless of who is asking - this is the
    // public-facing list. Full visibility (including hidden reviews) is only
    // available through the separate admin moderation endpoint.
    const filter = { business: business._id, isVisible: true };

    const [reviews, total] = await Promise.all([
        reviewModel.find(filter)
            .populate("customer", "name avatar")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        reviewModel.countDocuments(filter),
    ]);

    sendList(res, reviews, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
    });
});

const updateVisibility = asyncHandler(async (req: Request, res: Response) => {
    const review = await reviewModel.findById(req.params.id);
    if (!review) {
        res.status(404).json({ success: false, message: "Review not found", errors: [] });
        return;
    }

    const businessIdStr = review.business.toString();

    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            review.isVisible = req.body.isVisible;
            await review.save({ session });

            await recalculateBusinessRating(businessIdStr, session);
        });
    } finally {
        await session.endSession();
    }

    sendSuccess(res, review);
});

const listForAdmin = asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || DEFAULT_LIMIT, 1), MAX_LIMIT);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (req.query.isVisible === "true") {
        filter.isVisible = true;
    } else if (req.query.isVisible === "false") {
        filter.isVisible = false;
    }

    // Never populate password/refreshTokens - only safe fields.
    const [reviews, total] = await Promise.all([
        reviewModel.find(filter)
            .populate("customer", "name")
            .populate("business", "name")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        reviewModel.countDocuments(filter),
    ]);

    sendList(res, reviews, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
    });
});

export default { create, listMine, listByBusiness, updateVisibility, listForAdmin };
