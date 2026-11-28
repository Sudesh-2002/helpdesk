import { Router } from "express";
import { protect, authorize } from "../middleware/auth.js";
import { stats, listStaff, createStaff, updateStaff } from "../controllers/admin.controller.js";

const router = Router();

router.use(protect, authorize("admin"));

router.get("/stats", stats);
router.get("/staff", listStaff);
router.post("/staff", createStaff);
router.patch("/staff/:id", updateStaff);

export default router;