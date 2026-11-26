import { Router } from "express";
import Notification from "../models/Notification.js";
import { protect } from "../middleware/auth.js";

const router = Router();
router.use(protect);

router.get("/", async (req, res) => {
  const [notifications, unread] = await Promise.all([
    Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(20).select("-email"),
    Notification.countDocuments({ user: req.user._id, readAt: null }),
  ]);
  res.json({ notifications, unread });
});

router.patch("/read-all", async (req, res) => {
  await Notification.updateMany({ user: req.user._id, readAt: null }, { readAt: new Date() });
  res.json({ ok: true });
});

router.patch("/:id/read", async (req, res) => {
  await Notification.updateOne(
    { _id: req.params.id, user: req.user._id },
    { readAt: new Date() }
  );
  res.json({ ok: true });
});

export default router;