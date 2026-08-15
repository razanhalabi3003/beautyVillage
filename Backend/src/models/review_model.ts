import mongoose from "mongoose";
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
    customer: {
        type: Schema.Types.ObjectId,
        ref: "Users",
        required: true,
    },
    business: {
        type: Schema.Types.ObjectId,
        ref: "Businesses",
        required: true,
    },
    appointment: {
        type: Schema.Types.ObjectId,
        ref: "Appointments",
        required: true,
        unique: true,
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
    },
    comment: {
        type: String,
        required: false,
        maxlength: 500,
    },
    isVisible: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });

// appointment already gets a unique index from `unique: true` above.
reviewSchema.index({ business: 1 });

const reviewModel = mongoose.model("Reviews", reviewSchema);

export default reviewModel;
