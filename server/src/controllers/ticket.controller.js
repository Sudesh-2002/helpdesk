import { z } from "zod";
import User from "../models/User.js";
import Ticket, { STATUSES, PRIORITIES } from "../models/Ticket.js";
import Message from "../models/Message.js";
import { firstResponseDueAt } from "../utils/sla.js";
import { logEvent } from "../utils/events.js";
import { isStaff } from "../policies/ticket.policy.js";
import mongoose from "mongoose";

const createSchema = z.object({
  subject: z.string().min(3).max(150),
  body: z.string().min(1).max(5000),
  priority: z.enum(PRIORITIES).default("medium"),
});

const listSchema = z.object({
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  assignee: z.enum(["me", "unassigned"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function createTicket(req, res) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ message: "Validation failed", errors: parsed.error.issues });

  const { subject, body, priority } = parsed.data;

  const ticket = await Ticket.create({
    subject,
    priority,
    customer: req.user._id,
    firstResponseDueAt: firstResponseDueAt(priority),
  });
  await Message.create({ ticket: ticket._id, sender: req.user._id, body });
  await logEvent(ticket._id, req.user._id, "created", { priority });

  res.status(201).json({ ticket });
}

export async function listTickets(req, res) {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success)
    return res.status(400).json({ message: "Invalid filters", errors: parsed.error.issues });

  const { status, priority, assignee, page, limit } = parsed.data;
  const staff = isStaff(req.user);

  const filter = {};
  if (!staff) filter.customer = req.user._id;
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (staff && assignee === "me") filter.assignee = req.user._id;
  if (staff && assignee === "unassigned") filter.assignee = null;

  const [tickets, total] = await Promise.all([
    Ticket.find(filter)
      .sort({ lastMessageAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("customer", "name email")
      .populate("assignee", "name"),
    Ticket.countDocuments(filter),
  ]);

  res.json({ tickets, total, page, pages: Math.ceil(total / limit) });
}

export async function getTicket(req, res) {
  const ticket = await req.ticket.populate([
    { path: "customer", select: "name email" },
    { path: "assignee", select: "name" },
  ]);

  const messageFilter = { ticket: ticket._id };
  if (!isStaff(req.user)) messageFilter.isInternal = false; // hide internal notes from customers

  const messages = await Message.find(messageFilter)
    .sort({ createdAt: 1 })
    .populate("sender", "name role");

  res.json({ ticket, messages });
}

const messageSchema = z.object({
  body: z.string().min(1).max(5000),
  isInternal: z.boolean().optional(),
});

export async function addMessage(req, res) {
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ message: "Validation failed", errors: parsed.error.issues });

  const ticket = req.ticket;
  if (ticket.status === "closed")
    return res.status(409).json({ message: "Ticket is closed" });

  const staff = isStaff(req.user);
  const isInternal = staff && parsed.data.isInternal === true; // customers can never post internal notes

  const message = await Message.create({
    ticket: ticket._id,
    sender: req.user._id,
    body: parsed.data.body,
    isInternal,
  });

  const set = { lastMessageAt: new Date() };
  const unset = {};
  let newStatus = null;

  if (staff && !isInternal) {
    if (!ticket.firstRespondedAt) set.firstRespondedAt = new Date();
    if (ticket.status === "open") newStatus = "pending"; // ball is in the customer's court
  } else if (!staff && ["pending", "resolved"].includes(ticket.status)) {
    newStatus = "open"; // customer replied, so it needs attention again
    if (ticket.status === "resolved") unset.resolvedAt = "";
  }

  if (newStatus) set.status = newStatus;

  await Ticket.updateOne(
    { _id: ticket._id },
    { $set: set, ...(Object.keys(unset).length && { $unset: unset }) }
  );

  if (newStatus)
    await logEvent(ticket._id, req.user._id, "status_changed", { from: ticket.status, to: newStatus });

  await message.populate("sender", "name role");
  res.status(201).json({ message });
}

const statusSchema = z.object({ status: z.enum(STATUSES) });

export async function assignTicket(req, res) {
  const { assigneeId } = req.body ?? {};
  let target = req.user;

  // only admins can assign to someone else
  if (assigneeId) {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Only admins can assign to another agent" });
    if (!mongoose.isValidObjectId(assigneeId))
      return res.status(400).json({ message: "Invalid assignee id" });

    target = await User.findOne({ _id: assigneeId, role: { $in: ["agent", "admin"] } });
    if (!target) return res.status(400).json({ message: "Assignee must be an agent or admin" });
  }

  // Atomic claim: for agents the update only matches if nobody has it yet,
  // so two agents clicking "claim" at once can't both win.
  const filter = { _id: req.ticket._id };
  if (req.user.role !== "admin") filter.assignee = null;

  const ticket = await Ticket.findOneAndUpdate(filter, { assignee: target._id }, { new: true });
  if (!ticket) return res.status(409).json({ message: "Ticket is already assigned" });

  await logEvent(ticket._id, req.user._id, "assigned", { to: target._id });
  res.json({ ticket });
}

export async function updateStatus(req, res) {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid status" });

  const { status } = parsed.data;
  const ticket = req.ticket;

  if (!isStaff(req.user) && status !== "closed")
    return res.status(403).json({ message: "Forbidden" });

  if (ticket.status === status) return res.json({ ticket });

  const from = ticket.status;
  ticket.status = status;
  if (status === "resolved") ticket.resolvedAt = new Date();
  if (status === "open") ticket.resolvedAt = undefined;
  await ticket.save();

  await logEvent(ticket._id, req.user._id, "status_changed", { from, to: status });
  res.json({ ticket });
}