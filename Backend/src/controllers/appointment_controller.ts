import { Request, Response } from "express";
import businessModel from "../models/business_model";
import serviceModel from "../models/service_model";
import appointmentModel from "../models/appointment_model";
import asyncHandler from "../utils/asyncHandler";
import { sendSuccess, sendList } from "../utils/apiResponse";
import { computeEndDateTime, isWithinWorkingHours } from "../utils/appointmentUtils";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

// Owner/admin decisions only - cancellation is handled entirely by the
// separate /cancel endpoint below, never through this map.
const ALLOWED_OWNER_TRANSITIONS: Record<string, string[]> = {
    pending: ["confirmed", "rejected"],
    confirmed: ["completed"],
};

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

    // Booking eligibility is stricter than Stage 6's canViewBusiness helper
    // (which lets the owner/admin bypass visibility) - nobody, including an
    // admin, may book at a business that isn't publicly approved+active.
    if (business.approvalStatus !== "approved" || business.isActive !== true) {
        res.status(400).json({
            success: false,
            message: "This business is not currently accepting appointments",
            errors: [],
        });
        return;
    }

    if (business.owner.toString() === req.user.id) {
        res.status(403).json({
            success: false,
            message: "You cannot book an appointment at your own business",
            errors: [],
        });
        return;
    }

    const service = await serviceModel.findById(req.body.service);
    if (!service || service.business.toString() !== business._id.toString()) {
        res.status(404).json({ success: false, message: "Service not found", errors: [] });
        return;
    }

    if (!service.isActive) {
        res.status(400).json({ success: false, message: "This service is not currently available", errors: [] });
        return;
    }

    const startDateTime = new Date(req.body.startDateTime);
    if (startDateTime.getTime() < Date.now()) {
        res.status(400).json({ success: false, message: "Cannot book an appointment in the past", errors: [] });
        return;
    }

    // endDateTime is always computed server-side from the service's own
    // duration - never accepted from the client.
    const endDateTime = computeEndDateTime(startDateTime, service.durationMinutes);

    if (!isWithinWorkingHours(business.workingHours, startDateTime, endDateTime)) {
        res.status(400).json({
            success: false,
            message: "The selected time is outside the business's working hours",
            errors: [],
        });
        return;
    }

    // Half-open interval overlap check: only pending/confirmed appointments
    // block a new booking; cancelled/rejected ones do not.
    const conflict = await appointmentModel.findOne({
        business: business._id,
        status: { $in: ["pending", "confirmed"] },
        startDateTime: { $lt: endDateTime },
        endDateTime: { $gt: startDateTime },
    });
    if (conflict) {
        res.status(400).json({
            success: false,
            message: "This time slot is no longer available",
            errors: [],
        });
        return;
    }

    const appointment = await appointmentModel.create({
        customer: req.user.id,
        business: business._id,
        service: service._id,
        startDateTime,
        endDateTime,
        status: "pending",
        customerNote: req.body.customerNote,
    });

    sendSuccess(res, appointment, 201);
});

const getMine = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized", errors: [] });
        return;
    }

    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || DEFAULT_LIMIT, 1), MAX_LIMIT);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { customer: req.user.id };
    if (typeof req.query.status === "string") {
        filter.status = req.query.status;
    }

    const [appointments, total] = await Promise.all([
        appointmentModel.find(filter)
            .populate("business", "name")
            .populate("service", "name price durationMinutes")
            .sort({ startDateTime: -1 })
            .skip(skip)
            .limit(limit),
        appointmentModel.countDocuments(filter),
    ]);

    sendList(res, appointments, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
    });
});

const getBusinessAppointments = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized", errors: [] });
        return;
    }

    const business = await businessModel.findById(req.params.businessId);
    if (!business) {
        res.status(404).json({ success: false, message: "Business not found", errors: [] });
        return;
    }

    const isOwner = business.owner.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
        res.status(403).json({ success: false, message: "Forbidden", errors: [] });
        return;
    }

    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || DEFAULT_LIMIT, 1), MAX_LIMIT);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { business: business._id };
    if (typeof req.query.status === "string") {
        filter.status = req.query.status;
    }

    // Never populate password/refreshTokens - only safe fields.
    const [appointments, total] = await Promise.all([
        appointmentModel.find(filter)
            .populate("customer", "name phone")
            .populate("service", "name price durationMinutes")
            .sort({ startDateTime: 1 })
            .skip(skip)
            .limit(limit),
        appointmentModel.countDocuments(filter),
    ]);

    sendList(res, appointments, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
    });
});

const updateStatus = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized", errors: [] });
        return;
    }

    const appointment = await appointmentModel.findById(req.params.id);
    if (!appointment) {
        res.status(404).json({ success: false, message: "Appointment not found", errors: [] });
        return;
    }

    // Owner-only, by design - not even admin can use this endpoint (see
    // Stage 7 admin-permissions correction). Ownership is what naturally
    // excludes admin here, since admin's id never equals a business's owner.
    const business = await businessModel.findById(appointment.business);
    if (!business || business.owner.toString() !== req.user.id) {
        res.status(403).json({ success: false, message: "Forbidden", errors: [] });
        return;
    }

    const requestedStatus: string = req.body.status;
    const allowedNextStatuses = ALLOWED_OWNER_TRANSITIONS[appointment.status] || [];
    if (!allowedNextStatuses.includes(requestedStatus)) {
        res.status(400).json({
            success: false,
            message: `Cannot change status from ${appointment.status} to ${requestedStatus}`,
            errors: [],
        });
        return;
    }

    // An appointment can only be marked completed once it has actually ended.
    if (requestedStatus === "completed" && appointment.endDateTime.getTime() > Date.now()) {
        res.status(400).json({
            success: false,
            message: "Cannot mark an appointment as completed before it has ended",
            errors: [],
        });
        return;
    }

    appointment.status = requestedStatus as typeof appointment.status;
    await appointment.save();

    sendSuccess(res, appointment);
});

const cancel = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized", errors: [] });
        return;
    }

    const appointment = await appointmentModel.findById(req.params.id);
    if (!appointment) {
        res.status(404).json({ success: false, message: "Appointment not found", errors: [] });
        return;
    }

    const isCustomer = appointment.customer.toString() === req.user.id;
    let isOwner = false;
    if (!isCustomer) {
        const business = await businessModel.findById(appointment.business);
        isOwner = !!business && business.owner.toString() === req.user.id;
    }

    if (!isCustomer && !isOwner) {
        res.status(403).json({ success: false, message: "Forbidden", errors: [] });
        return;
    }

    const isFuture = appointment.startDateTime.getTime() > Date.now();

    if (isCustomer) {
        if (!["pending", "confirmed"].includes(appointment.status)) {
            res.status(400).json({
                success: false,
                message: `Cannot cancel an appointment with status ${appointment.status}`,
                errors: [],
            });
            return;
        }
        if (!isFuture) {
            res.status(400).json({ success: false, message: "Cannot cancel a past appointment", errors: [] });
            return;
        }
    } else {
        // Business-owner cancellation: confirmed only (a pending one is
        // handled via reject on /status instead), and still in the future.
        if (appointment.status !== "confirmed") {
            res.status(400).json({
                success: false,
                message: "Only a confirmed appointment can be cancelled by the business",
                errors: [],
            });
            return;
        }
        if (!isFuture) {
            res.status(400).json({ success: false, message: "Cannot cancel a past appointment", errors: [] });
            return;
        }
    }

    appointment.status = "cancelled";
    if (req.body.cancellationReason) {
        appointment.cancellationReason = req.body.cancellationReason;
    }
    await appointment.save();

    sendSuccess(res, appointment);
});

export default { create, getMine, getBusinessAppointments, updateStatus, cancel };
