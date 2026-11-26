import cron from "node-cron";
import Ticket from "../models/Ticket.js";
import User from "../models/User.js";
import { logEvent } from "../utils/events.js";
import { notify } from "../services/notify.js";
import { getIO } from "../socket/index.js";
import { rooms } from "../socket/rooms.js";
import { emitTicketUpdate } from "../socket/emitters.js";

export async function checkSlaBreaches() {
  const now = new Date();

  const overdue = await Ticket.find({
    status: { $in: ["open", "pending"] },
    firstRespondedAt: null,
    firstResponseDueAt: { $lte: now },
    slaBreachedAt: null,
  }).limit(100);

  for (const ticket of overdue) {
    try {
      const { modifiedCount } = await Ticket.updateOne(
        { _id: ticket._id, slaBreachedAt: null },
        { $set: { slaBreachedAt: now } }
      );
      if (!modifiedCount) continue;

      await logEvent(ticket._id, null, "sla_breached", { dueAt: ticket.firstResponseDueAt });

      const recipients = ticket.assignee
        ? [ticket.assignee]
        : (await User.find({ role: "admin" }).select("_id")).map((u) => u._id);

      const text = `SLA breached: no first response on "${ticket.subject}"`;
      await Promise.all(recipients.map((user) => notify({ user, type: "sla_breach", ticket, text })));

      getIO()?.to(rooms.staff).emit("sla:breached", { _id: ticket._id, subject: ticket.subject });
      await emitTicketUpdate(ticket._id, { staffOnly: true });
    } catch (err) {
      console.error("SLA check failed for ticket", ticket._id, err);
    }
  }
}

export function startSlaJob() {
  cron.schedule("* * * * *", () => checkSlaBreaches().catch(console.error));
}