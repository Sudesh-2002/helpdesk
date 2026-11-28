import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.js";
import Ticket from "../models/Ticket.js";
import { firstResponseDueAt } from "../utils/sla.js";

await mongoose.connect(process.env.MONGO_URI);

if (process.argv.includes("--clean")) {
  const r = await Ticket.deleteMany({ subject: /^\[demo\]/ });
  console.log("Removed demo tickets:", r.deletedCount);
  await mongoose.disconnect();
  process.exit(0);
}

const HOUR = 36e5, DAY = 24 * HOUR;
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rand = (min, max) => min + Math.random() * (max - min);
const ensure = async (d) => (await User.findOne({ email: d.email })) || User.create(d);

const customer = await ensure({ name: "Demo Customer", email: "demo.customer@example.com", password: "Password123", role: "customer" });
const agents = [
  await ensure({ name: "Agent One", email: "agent1@helpdesk.local", password: "Agent@12345", role: "agent" }),
  await ensure({ name: "Agent Two", email: "agent2@helpdesk.local", password: "Agent@12345", role: "agent" }),
];

const subjects = ["Login issue", "Billing question", "Feature request", "App crashes on start", "Cannot upload file", "Password reset", "Slow dashboard"];
const now = Date.now();
const docs = [];

for (let i = 0; i < 80; i++) {
  const createdAt = new Date(now - rand(0, 30 * DAY));
  const priority = pick(["low", "medium", "medium", "high", "urgent"]);
  const due = firstResponseDueAt(priority, createdAt);

  let firstRespondedAt = new Date(createdAt.getTime() + rand(0.1, 1.6) * (due - createdAt));
  if (firstRespondedAt.getTime() > now || Math.random() < 0.1) firstRespondedAt = null;

  const status = firstRespondedAt ? pick(["pending", "resolved", "resolved", "closed"]) : "open";
  let resolvedAt = null;
  if (status === "resolved") {
    resolvedAt = new Date(Math.min(now, firstRespondedAt.getTime() + rand(1, 24) * HOUR));
  }

  docs.push({
    _id: new mongoose.Types.ObjectId(),
    subject: `[demo] ${pick(subjects)}`,
    customer: customer._id,
    assignee: firstRespondedAt || Math.random() < 0.3 ? pick(agents)._id : null,
    status,
    priority,
    firstResponseDueAt: due,
    firstRespondedAt,
    resolvedAt,
    slaBreachedAt: null,
    lastMessageAt: resolvedAt || firstRespondedAt || createdAt,
    createdAt,
    updatedAt: createdAt,
    __v: 0,
  });
}

await Ticket.collection.insertMany(docs);
console.log(`Inserted ${docs.length} demo tickets`);
await mongoose.disconnect();