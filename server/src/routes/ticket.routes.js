import { Router } from "express";
import { protect, authorize } from "../middleware/auth.js";
import { loadTicket } from "../middleware/ticket.js";
import { createTicket, listTickets, getTicket } from "../controllers/ticket.controller.js";

const router = Router();

router.use(protect);

router.post("/", authorize("customer"), createTicket);
router.get("/", listTickets);
router.get("/:id", loadTicket, getTicket);

export default router;