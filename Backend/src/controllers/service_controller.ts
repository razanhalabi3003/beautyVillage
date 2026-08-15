import { Request, Response } from "express";
import businessModel from "../models/business_model";
import serviceModel from "../models/service_model";
import asyncHandler from "../utils/asyncHandler";
import { sendSuccess, sendList } from "../utils/apiResponse";
import { canViewBusiness } from "../utils/businessVisibility";

const list = asyncHandler(async (req: Request, res: Response) => {
    const business = await businessModel.findById(req.params.businessId);
    if (!business) {
        res.status(404).json({ success: false, message: "Business not found", errors: [] });
        return;
    }

    if (!canViewBusiness(business, req.user)) {
        res.status(404).json({ success: false, message: "Business not found", errors: [] });
        return;
    }

    const isOwnerOrAdmin = !!req.user && (business.owner.toString() === req.user.id || req.user.role === "admin");

    // Guests only ever see active services; the owner/admin dashboard needs
    // to see inactive ones too, with isActive included, to manage them.
    const filter: Record<string, unknown> = { business: business._id };
    if (!isOwnerOrAdmin) {
        filter.isActive = true;
    }

    const services = await serviceModel.find(filter).sort({ createdAt: 1 });
    sendList(res, services, {
        page: 1,
        limit: services.length,
        total: services.length,
        totalPages: 1,
    });
});

const create = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized", errors: [] });
        return;
    }

    const business = await businessModel.findById(req.body.business);
    if (!business) {
        res.status(404).json({ success: false, message: "Business not found", errors: [] });
        return;
    }

    if (business.owner.toString() !== req.user.id) {
        res.status(403).json({ success: false, message: "Forbidden", errors: [] });
        return;
    }

    if (business.approvalStatus !== "approved") {
        res.status(400).json({
            success: false,
            message: "Services can only be added to an approved business",
            errors: [],
        });
        return;
    }

    // isActive is always hardcoded here - never taken from req.body, even
    // though JOI already rejects that key before this code runs.
    const service = await serviceModel.create({
        business: business._id,
        name: req.body.name,
        description: req.body.description,
        price: req.body.price,
        durationMinutes: req.body.durationMinutes,
        isActive: true,
    });

    sendSuccess(res, service, 201);
});

const update = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized", errors: [] });
        return;
    }

    const service = await serviceModel.findById(req.params.id);
    if (!service) {
        res.status(404).json({ success: false, message: "Service not found", errors: [] });
        return;
    }

    const business = await businessModel.findById(service.business);
    if (!business || business.owner.toString() !== req.user.id) {
        res.status(403).json({ success: false, message: "Forbidden", errors: [] });
        return;
    }

    // req.body only ever contains name/description/price/durationMinutes/
    // isActive - enforced by updateServiceSchema (unknown(false)). isActive
    // lets the owner reactivate a previously-deactivated service through
    // this same endpoint, since there is no separate reactivate route.
    Object.assign(service, req.body);
    await service.save();

    sendSuccess(res, service);
});

const deactivate = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized", errors: [] });
        return;
    }

    const service = await serviceModel.findById(req.params.id);
    if (!service) {
        res.status(404).json({ success: false, message: "Service not found", errors: [] });
        return;
    }

    const business = await businessModel.findById(service.business);
    if (!business || business.owner.toString() !== req.user.id) {
        res.status(403).json({ success: false, message: "Forbidden", errors: [] });
        return;
    }

    service.isActive = false;
    await service.save();

    sendSuccess(res, service);
});

export default { list, create, update, deactivate };
