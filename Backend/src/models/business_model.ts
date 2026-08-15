import mongoose from "mongoose";
const Schema = mongoose.Schema;

const workingHourSchema = new Schema({
    day: {
        type: Number,
        required: true,
        min: 0,
        max: 6,
    },
    isOpen: {
        type: Boolean,
        required: true,
        default: false,
    },
    startTime: {
        type: String,
        required: false,
    },
    endTime: {
        type: String,
        required: false,
    },
}, { _id: false });

const businessSchema = new Schema({
    owner: {
        type: Schema.Types.ObjectId,
        ref: "Users",
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: "Categories",
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true,
    },
    workingHours: {
        type: [workingHourSchema],
        default: [],
    },
    approvalStatus: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
    },
    rejectionReason: {
        type: String,
        required: false,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    averageRating: {
        type: Number,
        default: 0,
    },
    reviewCount: {
        type: Number,
        default: 0,
    },
}, { timestamps: true });

// owner already gets a unique index from `unique: true` above.
businessSchema.index({ category: 1 });
businessSchema.index({ approvalStatus: 1, isActive: 1 });

const businessModel = mongoose.model("Businesses", businessSchema);

export default businessModel;
