import cron from "node-cron";
import Notification from "../models/Notification.js";
import { sendMail } from "../services/mailer.js";

const MAX_ATTEMPTS = 3;
let running = false;

async function processBatch() {
  if (running) return;
  running = true;
  try {
    for (let i = 0; i < 20; i++) {
      const n = await Notification.findOneAndUpdate(
        {
          "email.status": "pending",
          "email.attempts": { $lt: MAX_ATTEMPTS },
          "email.retryAt": { $not: { $gt: new Date() } },
        },
        { $set: { "email.status": "sending" }, $inc: { "email.attempts": 1 } },
        { sort: { createdAt: 1 }, new: true }
      ).populate("user", "email");

      if (!n) break;

      try {
        if (!n.user?.email) throw new Error("Recipient has no email");
        const link = `${process.env.CLIENT_URL}/tickets/${n.ticket}`;
        await sendMail({
          to: n.user.email,
          subject: `[Helpdesk] ${n.text}`,
          text: `${n.text}\n\nOpen the ticket: ${link}`,
          html: `<p>${n.text}</p><p><a href="${link}">Open the ticket</a></p>`,
        });
        n.email.status = "sent";
        n.email.sentAt = new Date();
        n.email.lastError = undefined;
      } catch (err) {
        n.email.lastError = err.message;
        if (n.email.attempts >= MAX_ATTEMPTS) {
          n.email.status = "failed";
        } else {
          n.email.status = "pending";
          n.email.retryAt = new Date(Date.now() + n.email.attempts * 60_000);
        }
      }
      await n.save();
    }
  } finally {
    running = false;
  }
}

export async function startEmailWorker() {
  await Notification.updateMany(
    { "email.status": "sending" },
    { $set: { "email.status": "pending" } }
  );
  cron.schedule("*/15 * * * * *", () => processBatch().catch(console.error));
}