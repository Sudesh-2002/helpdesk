import "dotenv/config";
import http from "http";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { initSocket } from "./socket/index.js";
import { startEmailWorker } from "./jobs/emailWorker.js";
import { startSlaJob } from "./jobs/slaJob.js";

const PORT = process.env.PORT || 5000;

await connectDB();

const httpServer = http.createServer(app);
initSocket(httpServer);
await startEmailWorker();
startSlaJob();

httpServer.listen(PORT, () => console.log(`API + sockets running on port ${PORT}`));