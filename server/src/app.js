import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import { notFound, errorHandler } from "./middleware/error.js";
import ticketRoutes from "./routes/ticket.routes.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});
app.use("/api/auth", authRoutes);

app.use("/api/tickets", ticketRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;