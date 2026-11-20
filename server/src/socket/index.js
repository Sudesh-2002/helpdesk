import { Server } from "socket.io";
import { parse } from "cookie";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import Ticket from "../models/Ticket.js";
import { canViewTicket, isStaff } from "../policies/ticket.policy.js";
import { rooms } from "./rooms.js";

let io;
export const getIO = () => io;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL, credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const { token } = parse(socket.handshake.headers.cookie || "");
      if (!token) return next(new Error("unauthorized"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error("unauthorized"));

      socket.data.user = user;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user;

    socket.join(rooms.user(user._id)); // personal updates for the ticket list
    if (isStaff(user)) socket.join(rooms.staff);

    socket.on("ticket:join", async (ticketId, ack = () => {}) => {
      try {
        if (!mongoose.isValidObjectId(ticketId))
          return ack({ ok: false, error: "Invalid ticket id" });

        const ticket = await Ticket.findById(ticketId).select("customer");
        if (!ticket || !canViewTicket(user, ticket))
          return ack({ ok: false, error: "Ticket not found" });

        socket.join(rooms.ticket(ticketId));
        if (isStaff(user)) socket.join(rooms.ticketStaff(ticketId));
        ack({ ok: true });
      } catch (err) {
        console.error(err);
        ack({ ok: false, error: "Server error" });
      }
    });

    socket.on("ticket:leave", (ticketId) => {
      socket.leave(rooms.ticket(ticketId));
      socket.leave(rooms.ticketStaff(ticketId));
    });

    socket.on("typing", ({ ticketId, isTyping } = {}) => {
      const room = rooms.ticket(ticketId);
      if (!socket.rooms.has(room)) return; // must have passed the join check
      socket.to(room).emit("typing", {
        ticketId: String(ticketId),
        user: { id: user._id, name: user.name },
        isTyping: Boolean(isTyping),
      });
    });
  });

  return io;
}