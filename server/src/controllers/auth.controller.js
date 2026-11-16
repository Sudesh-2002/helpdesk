import { z } from "zod";
import User from "../models/User.js";
import { signToken, setAuthCookie, clearAuthCookie } from "../utils/token.js";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role });

export async function register(req, res) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ message: "Validation failed", errors: parsed.error.issues });

  // role is never taken from the request: public signups are always customers
  const user = await User.create(parsed.data);
  setAuthCookie(res, signToken(user));
  res.status(201).json({ user: publicUser(user) });
}

export async function login(req, res) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid credentials" });

  const user = await User.findOne({ email: parsed.data.email }).select("+password");
  if (!user || !(await user.comparePassword(parsed.data.password)))
    return res.status(401).json({ message: "Invalid credentials" });

  setAuthCookie(res, signToken(user));
  res.json({ user: publicUser(user) });
}

export function logout(req, res) {
  clearAuthCookie(res);
  res.json({ message: "Logged out" });
}

export function me(req, res) {
  res.json({ user: publicUser(req.user) });
}