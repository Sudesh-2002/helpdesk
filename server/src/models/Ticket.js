import mongoose from "mongoose";

export const STATUSES = ["open", "pending", "resolved", "closed"];
export const PRIORITIES = ["low", "medium", "high", "urgent"];

const ticketSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true, trim: true, maxlength: 150 },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    status: { type: String, enum: STATUSES, default: "open" },
    priority: { type: String, enum: PRIORITIES, default: "medium" },
    firstResponseDueAt: Date,
    firstRespondedAt: Date,
    resolvedAt: Date,
    slaBreachedAt: { type: Date, default: null },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

ticketSchema.index({ status: 1, priority: 1, lastMessageAt: -1 });

export default mongoose.model("Ticket", ticketSchema);