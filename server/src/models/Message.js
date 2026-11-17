import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true, trim: true, maxlength: 5000 },
    isInternal: { type: Boolean, default: false },
  },
  { timestamps: true }
);

messageSchema.index({ ticket: 1, createdAt: 1 });

export default mongoose.model("Message", messageSchema);