import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.js";

await mongoose.connect(process.env.MONGO_URI);

const email = "admin@helpdesk.local";
if (!(await User.findOne({ email }))) {
  await User.create({ name: "Admin", email, password: "Admin@12345", role: "admin" });
  console.log("Admin created:", email);
} else {
  console.log("Admin already exists");
}

await mongoose.disconnect();