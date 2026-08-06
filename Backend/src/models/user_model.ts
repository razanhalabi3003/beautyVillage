import mongoose from "mongoose";
const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: false,
  },
  avatar: {
    type: String,
    required: false,
  },
  role: {
    type: String,
    enum: ["customer", "businessOwner", "admin"],
    default: "customer",
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  refreshTokens: {
    type: [String],
    default: [],
  }
}, { timestamps: true });
const userModel = mongoose.model("Users", userSchema);

export default userModel;
