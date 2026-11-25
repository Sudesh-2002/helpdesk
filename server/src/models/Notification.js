import mongoose from "mongoose";

export const NOTIFICATION_TYPES = ["reply", "assigned", "status", "sla_breach"];

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket", required: true },
    text: { type: String, required: true },
    readAt: { type: Date, default: null },
    email: {
      status: {
        type: String,
        enum: ["skipped", "pending", "sending", "sent", "failed"],
        default: "skipped",
      },
      attempts: { type: Number, default: 0 },
      retryAt: Date,
      lastError: String,
      sentAt: Date,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ "email.status": 1, "email.retryAt": 1 });

export default mongoose.model("Notification", notificationSchema);