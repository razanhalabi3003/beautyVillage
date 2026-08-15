import mongoose from "mongoose";
const Schema = mongoose.Schema;

const appointmentSchema = new Schema({
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
    service: {
        type: Schema.Types.ObjectId,
        ref: "Services",
        required: true,
    },
    startDateTime: {
        type: Date,
        required: true,
    },
    endDateTime: {
        type: Date,
        required: true,
    },
    status: {
        type: String,
        enum: ["pending", "confirmed", "completed", "cancelled", "rejected"],
        default: "pending",
    },
    customerNote: {
        type: String,
        required: false,
    },
    cancellationReason: {
        type: String,
        required: false,
    },
}, { timestamps: true });

appointmentSchema.index({ business: 1, startDateTime: 1 });
appointmentSchema.index({ customer: 1 });

const appointmentModel = mongoose.model("Appointments", appointmentSchema);

export default appointmentModel;
