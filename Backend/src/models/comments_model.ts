import mongoose from "mongoose";
const Schema = mongoose.Schema;
const commentsSchema = new Schema({
  comment: {
    type: String,
    required: true,
  },
  owner: {
    type: String,
    required: true,
  },
  postId: {
    type: String,
    required: true,
  },
});
const commentModel = mongoose.model("Comments", commentsSchema);

export default commentModel;
