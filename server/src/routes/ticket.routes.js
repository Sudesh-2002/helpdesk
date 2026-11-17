import { Router } from "express";
import { protect, authorize } from "../middleware/auth.js";
import { loadTicket } from "../middleware/ticket.js";
import {
  createTicket, listTickets, getTicket,
  addMessage, assignTicket, updateStatus,
} from "../controllers/ticket.controller.js";

const router = Router();

router.use(protect);

router.post("/", authorize("customer"), createTicket);
router.get("/", listTickets);
router.get("/:id", loadTicket, getTicket);
router.post("/:id/messages", loadTicket, addMessage);
router.patch("/:id/assign", authorize("agent", "admin"), loadTicket, assignTicket);
router.patch("/:id/status", loadTicket, updateStatus);

export default router;