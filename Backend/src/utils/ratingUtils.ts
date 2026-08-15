import mongoose, { ClientSession } from "mongoose";
import reviewModel from "../models/review_model";
import businessModel from "../models/business_model";

// Explicit, called directly after any change to a business's reviews
// (create/hide/restore) - never via a Mongoose hook, so the flow is easy to
// follow and explain. Only isVisible:true reviews count.
export const recalculateBusinessRating = async (businessId: string, session?: ClientSession): Promise<void> => {
    const result = await reviewModel.aggregate([
        { $match: { business: new mongoose.Types.ObjectId(businessId), isVisible: true } },
        { $group: { _id: "$business", averageRating: { $avg: "$rating" }, reviewCount: { $sum: 1 } } },
    ]).session(session ?? null);

    const { averageRating = 0, reviewCount = 0 } = result[0] || {};

    await businessModel.findByIdAndUpdate(
        businessId,
        { averageRating: Math.round(averageRating * 10) / 10, reviewCount },
        { session }
    );
};
