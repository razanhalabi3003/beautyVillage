import { Request, Response } from "express";
import businessModel from "../models/business_model";
import mediaModel from "../models/media_model";
import asyncHandler from "../utils/asyncHandler";
import { sendSuccess, sendList } from "../utils/apiResponse";
import { canViewBusiness } from "../utils/businessVisibility";

const MAX_PORTFOLIO_IMAGES = 6;

const uploadLogo = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized", errors: [] });
        return;
    }
    const business = await businessModel.findById(req.params.id);
    if (!business) {
        res.status(404).json({ success: false, message: "Business not found", errors: [] });
        return;
    }
    if (business.owner.toString() !== req.user.id) {
        res.status(403).json({ success: false, message: "Forbidden", errors: [] });
        return;
    }
    if (!req.file) {
        res.status(400).json({ success: false, message: "No file uploaded", errors: [] });
        return;
    }

    // A logo is unique per business - remove any existing one before saving.
    await mediaModel.deleteMany({ business: business._id, type: "logo" });

    const media = await mediaModel.create({
        business: business._id,
        type: "logo",
        data: req.file.buffer,
        contentType: req.file.mimetype,
        size: req.file.size,
    });

    sendSuccess(res, { _id: media._id, type: media.type, contentType: media.contentType, size: media.size }, 201);
});

const uploadCover = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized", errors: [] });
        return;
    }
    const business = await businessModel.findById(req.params.id);
    if (!business) {
        res.status(404).json({ success: false, message: "Business not found", errors: [] });
        return;
    }
    if (business.owner.toString() !== req.user.id) {
        res.status(403).json({ success: false, message: "Forbidden", errors: [] });
        return;
    }
    if (!req.file) {
        res.status(400).json({ success: false, message: "No file uploaded", errors: [] });
        return;
    }

    // A cover image is unique per business - remove any existing one first.
    await mediaModel.deleteMany({ business: business._id, type: "cover" });

    const media = await mediaModel.create({
        business: business._id,
        type: "cover",
        data: req.file.buffer,
        contentType: req.file.mimetype,
        size: req.file.size,
    });

    sendSuccess(res, { _id: media._id, type: media.type, contentType: media.contentType, size: media.size }, 201);
});

const uploadPortfolioImage = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized", errors: [] });
        return;
    }
    const business = await businessModel.findById(req.params.id);
    if (!business) {
        res.status(404).json({ success: false, message: "Business not found", errors: [] });
        return;
    }
    if (business.owner.toString() !== req.user.id) {
        res.status(403).json({ success: false, message: "Forbidden", errors: [] });
        return;
    }
    if (!req.file) {
        res.status(400).json({ success: false, message: "No file uploaded", errors: [] });
        return;
    }

    const existingCount = await mediaModel.countDocuments({ business: business._id, type: "portfolio" });
    if (existingCount >= MAX_PORTFOLIO_IMAGES) {
        res.status(400).json({
            success: false,
            message: `Portfolio image limit reached (max ${MAX_PORTFOLIO_IMAGES})`,
            errors: [],
        });
        return;
    }

    const media = await mediaModel.create({
        business: business._id,
        type: "portfolio",
        data: req.file.buffer,
        contentType: req.file.mimetype,
        size: req.file.size,
    });

    sendSuccess(res, { _id: media._id, type: media.type, contentType: media.contentType, size: media.size }, 201);
});

const deletePortfolioImage = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized", errors: [] });
        return;
    }
    const business = await businessModel.findById(req.params.id);
    if (!business) {
        res.status(404).json({ success: false, message: "Business not found", errors: [] });
        return;
    }
    if (business.owner.toString() !== req.user.id) {
        res.status(403).json({ success: false, message: "Forbidden", errors: [] });
        return;
    }

    const media = await mediaModel.findOne({
        _id: req.params.mediaId,
        business: business._id,
        type: "portfolio",
    });
    if (!media) {
        res.status(404).json({ success: false, message: "Portfolio image not found", errors: [] });
        return;
    }

    await media.deleteOne();
    sendSuccess(res, { deleted: true });
});

const getBusinessMedia = asyncHandler(async (req: Request, res: Response) => {
    const business = await businessModel.findById(req.params.businessId);
    if (!business) {
        res.status(404).json({ success: false, message: "Business not found", errors: [] });
        return;
    }
    if (!canViewBusiness(business, req.user)) {
        res.status(404).json({ success: false, message: "Business not found", errors: [] });
        return;
    }

    // Metadata only - never the raw buffer.
    const media = await mediaModel.find({ business: business._id }).select("-data");
    sendList(res, media, {
        page: 1,
        limit: media.length,
        total: media.length,
        totalPages: 1,
    });
});

const getMediaBytes = asyncHandler(async (req: Request, res: Response) => {
    // The media document's own existence is checked first, before anything
    // about the parent business's visibility.
    const media = await mediaModel.findById(req.params.id);
    if (!media) {
        res.status(404).json({ success: false, message: "Media not found", errors: [] });
        return;
    }

    const business = await businessModel.findById(media.business);
    if (!business || !canViewBusiness(business, req.user)) {
        res.status(404).json({ success: false, message: "Media not found", errors: [] });
        return;
    }

    res.set("Content-Type", media.contentType);
    res.send(media.data);
});

export default {
    uploadLogo,
    uploadCover,
    uploadPortfolioImage,
    deletePortfolioImage,
    getBusinessMedia,
    getMediaBytes,
};
