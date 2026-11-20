import { io } from "socket.io-client";

const BASE = "http://localhost:5000";
const ticketId = process.argv[2];
if (!ticketId) {
  console.error("Usage: npm run test:socket <ticketId>");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const json = { "Content-Type": "application/json" };
const cookieFrom = (res) => res.headers.getSetCookie()[0].split(";")[0];

async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth/login`, { method: "POST", headers: json, body: JSON.stringify({ email, password }) });
  if (!res.ok) throw new Error(`Login failed: ${email}`);
  return cookieFrom(res);
}

async function registerOutsider() {
  const email = `outsider${Date.now()}@example.com`;
  const res = await fetch(`${BASE}/api/auth/register`, { method: "POST", headers: json, body: JSON.stringify({ name: "Outsider", email, password: "Password123" }) });
  return cookieFrom(res);
}

const connect = (cookie, label) =>
  new Promise((resolve, reject) => {
    const s = io(BASE, { extraHeaders: { cookie }, transports: ["websocket"] });
    s.on("connect", () => resolve(s));
    s.on("connect_error", reject);
    s.on("message:new", (m) => console.log(`[${label}] message:new${m.isInternal ? " (INTERNAL)" : ""}:`, m.body));
    s.on("ticket:updated", (t) => console.log(`[${label}] ticket:updated: status=${t.status}`));
    s.on("typing", (t) => console.log(`[${label}] typing:`, t.user.name, t.isTyping));
    return s;
  });

const join = (s) => new Promise((r) => s.emit("ticket:join", ticketId, r));

const post = (cookie, body) =>
  fetch(`${BASE}/api/tickets/${ticketId}/messages`, { method: "POST", headers: { ...json, cookie }, body: JSON.stringify(body) });

const customerCookie = await login("test@example.com", "Password123");
const agentCookie = await login("agent1@helpdesk.local", "Agent@12345");
const outsiderCookie = await registerOutsider();

const customer = await connect(customerCookie, "customer");
const agent = await connect(agentCookie, "agent");
const outsider = await connect(outsiderCookie, "outsider");

console.log("customer join:", await join(customer));
console.log("agent join:   ", await join(agent));
console.log("outsider join:", await join(outsider)); // expect ok: false

customer.emit("typing", { ticketId, isTyping: true });
await sleep(200);
await post(agentCookie, { body: "Public reply from agent" });
await sleep(200);
await post(agentCookie, { body: "Internal note", isInternal: true });
await sleep(200);
await post(customerCookie, { body: "Thanks!" });

await sleep(1000);
[customer, agent, outsider].forEach((s) => s.close());