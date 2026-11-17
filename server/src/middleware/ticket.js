import mongoose from "mongoose";
import Ticket from "../models/Ticket.js";
import { canViewTicket } from "../policies/ticket.policy.js";

export async function loadTicket(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(400).json({ message: "Invalid ticket id" });

  const ticket = await Ticket.findById(req.params.id);

  // 404 (not 403) so customers can't probe for other people's ticket ids
  if (!ticket || !canViewTicket(req.user, ticket))
    return res.status(404).json({ message: "Ticket not found" });

  req.ticket = ticket;
  next();
}