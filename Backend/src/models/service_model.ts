import mongoose from "mongoose";
const Schema = mongoose.Schema;

const serviceSchema = new Schema({
    business: {
        type: Schema.Types.ObjectId,
        ref: "Businesses",
        required: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: false,
    },
    price: {
        type: Number,
        required: true,
        min: 0,
    },
    durationMinutes: {
        type: Number,
        required: true,
        min: 5,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });

serviceSchema.index({ business: 1 });

const serviceModel = mongoose.model("Services", serviceSchema);

export default serviceModel;
