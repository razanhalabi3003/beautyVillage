import mongoose from "mongoose";
const Schema = mongoose.Schema;

const categorySchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    image: {
        type: String,
        required: false,
        default: "",
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });

const categoryModel = mongoose.model("Categories", categorySchema);

export default categoryModel;
