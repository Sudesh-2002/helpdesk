import Notification from "../models/Notification.js";
import { getIO } from "../socket/index.js";
import { rooms } from "../socket/rooms.js";

const EMAIL_COLLAPSE_MS = 10 * 60 * 1000;

export async function notify({ user, type, ticket, text, email = true }) {
  const ticketId = ticket._id ?? ticket;

  let emailStatus = "skipped";
  if (email) {
    const recent = await Notification.exists({
      user,
      ticket: ticketId,
      type,
      readAt: null,
      createdAt: { $gt: new Date(Date.now() - EMAIL_COLLAPSE_MS) },
    });
    emailStatus = recent ? "skipped" : "pending";
  }

  const n = await Notification.create({
    user,
    type,
    ticket: ticketId,
    text,
    email: { status: emailStatus },
  });

  getIO()?.to(rooms.user(user)).emit("notification:new", {
    _id: n._id,
    type: n.type,
    ticket: String(n.ticket),
    text: n.text,
    createdAt: n.createdAt,
  });

  return n;
}