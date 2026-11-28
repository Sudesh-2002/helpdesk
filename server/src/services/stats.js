import Ticket from "../models/Ticket.js";
import User from "../models/User.js";

const DAY = 24 * 60 * 60 * 1000;
const TZ = process.env.STATS_TZ || "UTC";

const responded = { $ne: [{ $ifNull: ["$firstRespondedAt", null] }, null] };
const resolved = { $ne: [{ $ifNull: ["$resolvedAt", null] }, null] };
const unassigned = { $eq: [{ $ifNull: ["$assignee", null] }, null] };

const dayLabel = (date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(date);

export async function getStats(days) {
  const now = new Date();
  const since = new Date(now.getTime() - days * DAY);
  const inRange = { createdAt: { $gte: since } };

  const [snapshot, volumeRows, priorityRows, [kpi], agents] = await Promise.all([
    Ticket.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          unassigned: { $sum: { $cond: [unassigned, 1, 0] } },
        },
      },
    ]),

    Ticket.aggregate([
      { $match: inRange },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TZ } },
          count: { $sum: 1 },
        },
      },
    ]),

    Ticket.aggregate([
      { $match: inRange },
      { $group: { _id: "$priority", count: { $sum: 1 } } },
    ]),

    Ticket.aggregate([
      { $match: inRange },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          avgFirstResponseMs: {
            $avg: { $cond: [responded, { $subtract: ["$firstRespondedAt", "$createdAt"] }, null] },
          },
          avgResolutionMs: {
            $avg: { $cond: [resolved, { $subtract: ["$resolvedAt", "$createdAt"] }, null] },
          },
          slaEligible: {
            $sum: {
              $cond: [{ $or: [responded, { $lte: ["$firstResponseDueAt", now] }] }, 1, 0],
            },
          },
          slaMet: {
            $sum: {
              $cond: [
                { $and: [responded, { $lte: ["$firstRespondedAt", "$firstResponseDueAt"] }] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),

    Ticket.aggregate([
      { $match: { ...inRange, assignee: { $ne: null } } },
      {
        $group: {
          _id: "$assignee",
          assigned: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $in: ["$status", ["resolved", "closed"]] }, 1, 0] } },
          avgFirstResponseMs: {
            $avg: { $cond: [responded, { $subtract: ["$firstRespondedAt", "$createdAt"] }, null] },
          },
        },
      },
      { $lookup: { from: User.collection.name, localField: "_id", foreignField: "_id", as: "agent" } },
      { $unwind: "$agent" },
      { $project: { _id: 0, id: "$_id", name: "$agent.name", assigned: 1, resolved: 1, avgFirstResponseMs: 1 } },
      { $sort: { assigned: -1 } },
    ]),
  ]);

  const current = { open: 0, pending: 0, resolved: 0, closed: 0, unassigned: 0 };
  for (const row of snapshot) {
    current[row._id] = row.count;
    if (row._id === "open" || row._id === "pending") current.unassigned += row.unassigned;
  }

  const counts = new Map(volumeRows.map((r) => [r._id, r.count]));
  const volume = [];
  for (let i = days; i >= 0; i--) {
    const date = dayLabel(new Date(now.getTime() - i * DAY));
    volume.push({ date, count: counts.get(date) || 0 });
  }

  const byPriority = ["low", "medium", "high", "urgent"].map((p) => ({
    priority: p,
    count: priorityRows.find((r) => r._id === p)?.count || 0,
  }));

  const k = kpi || { total: 0, slaEligible: 0, slaMet: 0 };
  const round = (n) => (n == null ? null : Math.round(n));

  return {
    range: { days, since },
    current,
    kpis: {
      total: k.total,
      avgFirstResponseMs: round(k.avgFirstResponseMs),
      avgResolutionMs: round(k.avgResolutionMs),
      slaEligible: k.slaEligible,
      slaCompliance: k.slaEligible ? k.slaMet / k.slaEligible : null,
    },
    volume,
    byPriority,
    agents: agents.map((a) => ({ ...a, avgFirstResponseMs: round(a.avgFirstResponseMs) })),
  };
}