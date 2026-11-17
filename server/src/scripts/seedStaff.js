import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.js";

await mongoose.connect(process.env.MONGO_URI);

const staff = [
  { name: "Admin", email: "admin@helpdesk.local", password: "Admin@12345", role: "admin" },
  { name: "Agent One", email: "agent1@helpdesk.local", password: "Agent@12345", role: "agent" },
];

for (const s of staff) {
  if (await User.findOne({ email: s.email })) console.log("Exists:", s.email);
  else {
    await User.create(s);
    console.log("Created:", s.email);
  }
}

await mongoose.disconnect();