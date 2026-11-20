import Ticket from "../models/Ticket.js";
import { getIO } from "./index.js";
import { rooms } from "./rooms.js";

const loadPopulated = (id) =>
  Ticket.findById(id).populate("customer", "name email").populate("assignee", "name");

export function emitMessage(message) {
  const io = getIO();
  if (!io) return;
  const room = message.isInternal
    ? rooms.ticketStaff(message.ticket)
    : rooms.ticket(message.ticket);
  io.to(room).emit("message:new", message.toJSON());
}

export async function emitTicketCreated(ticketId) {
  const io = getIO();
  if (!io) return;
  const ticket = await loadPopulated(ticketId);
  if (ticket) io.to(rooms.staff).emit("ticket:created", ticket.toJSON());
}

export async function emitTicketUpdate(ticketId, { staffOnly = false } = {}) {
  const io = getIO();
  if (!io) return;
  const ticket = await loadPopulated(ticketId);
  if (!ticket) return;

  const target = staffOnly
    ? io.to(rooms.staff).to(rooms.ticketStaff(ticket._id))
    : io
        .to(rooms.staff)
        .to(rooms.user(ticket.customer._id))
        .to(rooms.ticket(ticket._id));

  target.emit("ticket:updated", ticket.toJSON());
}