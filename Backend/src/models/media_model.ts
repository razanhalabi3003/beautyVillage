import mongoose from "mongoose";
const Schema = mongoose.Schema;

const mediaSchema = new Schema({
    business: {
        type: Schema.Types.ObjectId,
        ref: "Businesses",
        required: true,
    },
    type: {
        type: String,
        enum: ["logo", "cover", "portfolio"],
        required: true,
    },
    data: {
        type: Buffer,
        required: true,
    },
    contentType: {
        type: String,
        required: true,
    },
    size: {
        type: Number,
        required: true,
    },
}, { timestamps: true });

mediaSchema.index({ business: 1, type: 1 });

const mediaModel = mongoose.model("Media", mediaSchema);

export default mediaModel;
