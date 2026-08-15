import { Request, Response } from "express";
import userModel from "../models/user_model";
import businessModel from "../models/business_model";
import appointmentModel from "../models/appointment_model";
import reviewModel from "../models/review_model";
import asyncHandler from "../utils/asyncHandler";
import { sendSuccess } from "../utils/apiResponse";

// Plain countDocuments per bucket - no aggregation pipeline needed at this
// scale, and it keeps each number trivially easy to reason about/test.
const getStats = asyncHandler(async (_req: Request, res: Response) => {
    const [
        usersTotal,
        usersActive,
        businessesTotal,
        businessesPending,
        businessesApproved,
        businessesRejected,
        businessesSuspended,
        appointmentsTotal,
        appointmentsPending,
        appointmentsConfirmed,
        appointmentsCompleted,
        appointmentsCancelled,
        appointmentsRejected,
        reviewsTotal,
        reviewsVisible,
    ] = await Promise.all([
        userModel.countDocuments(),
        userModel.countDocuments({ isActive: true }),
        businessModel.countDocuments(),
        businessModel.countDocuments({ approvalStatus: "pending" }),
        businessModel.countDocuments({ approvalStatus: "approved" }),
        businessModel.countDocuments({ approvalStatus: "rejected" }),
        businessModel.countDocuments({ approvalStatus: "approved", isActive: false }),
        appointmentModel.countDocuments(),
        appointmentModel.countDocuments({ status: "pending" }),
        appointmentModel.countDocuments({ status: "confirmed" }),
        appointmentModel.countDocuments({ status: "completed" }),
        appointmentModel.countDocuments({ status: "cancelled" }),
        appointmentModel.countDocuments({ status: "rejected" }),
        reviewModel.countDocuments(),
        reviewModel.countDocuments({ isVisible: true }),
    ]);

    sendSuccess(res, {
        users: {
            total: usersTotal,
            active: usersActive,
            inactive: usersTotal - usersActive,
        },
        businesses: {
            total: businessesTotal,
            pending: businessesPending,
            approved: businessesApproved,
            rejected: businessesRejected,
            suspended: businessesSuspended,
        },
        appointments: {
            total: appointmentsTotal,
            pending: appointmentsPending,
            confirmed: appointmentsConfirmed,
            completed: appointmentsCompleted,
            cancelled: appointmentsCancelled,
            rejected: appointmentsRejected,
        },
        reviews: {
            total: reviewsTotal,
            visible: reviewsVisible,
            hidden: reviewsTotal - reviewsVisible,
        },
    });
});

export default { getStats };
