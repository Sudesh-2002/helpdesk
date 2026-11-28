import { z } from "zod";
import mongoose from "mongoose";
import User from "../models/User.js";
import Ticket from "../models/Ticket.js";
import { getStats } from "../services/stats.js";
import { getIO } from "../socket/index.js";
import { rooms } from "../socket/rooms.js";
import { emitTicketUpdate } from "../socket/emitters.js";

const STAFF = ["agent", "admin"];

const publicStaff = (u) => ({
  _id: u._id, name: u.name, email: u.email, role: u.role, active: u.active, createdAt: u.createdAt,
});

export async function stats(req, res) {
  const parsed = z
    .object({ days: z.coerce.number().int().min(1).max(365).default(30) })
    .safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ message: "Invalid range" });

  res.json(await getStats(parsed.data.days));
}

export async function listStaff(req, res) {
  const staff = await User.find({ role: { $in: STAFF } }).sort({ role: 1, name: 1 });
  res.json({ staff: staff.map(publicStaff) });
}

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(STAFF).default("agent"),
});

export async function createStaff(req, res) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ message: "Validation failed", errors: parsed.error.issues });

  const user = await User.create(parsed.data); // duplicate email, 409 via the error handler
  res.status(201).json({ user: publicStaff(user) });
}

const updateSchema = z
  .object({ role: z.enum(STAFF).optional(), active: z.boolean().optional() })
  .refine((v) => v.role !== undefined || v.active !== undefined, { message: "Nothing to update" });

export async function updateStaff(req, res) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid id" });

  if (req.user._id.equals(id))
    return res.status(400).json({ message: "You can't change your own account" });

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid update" });
  const { role, active } = parsed.data;

  const update = {};
  if (role !== undefined) update.role = role;
  if (active !== undefined) update.active = active;

  const user = await User.findOneAndUpdate(
    { _id: id, role: { $in: STAFF } },
    { $set: update },
    { new: true }
  );
  if (!user) return res.status(404).json({ message: "Staff member not found" });

  getIO()?.in(rooms.user(id)).disconnectSockets(true);

  if (active === false) {
    const tickets = await Ticket.find({ assignee: id, status: { $in: ["open", "pending"] } }).select("_id");
    await Ticket.updateMany({ _id: { $in: tickets.map((t) => t._id) } }, { $set: { assignee: null } });
    tickets.forEach((t) => emitTicketUpdate(t._id).catch(console.error));
  }

  res.json({ user: publicStaff(user) });
}