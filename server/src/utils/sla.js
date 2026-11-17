const SLA_HOURS = { urgent: 1, high: 2, medium: 8, low: 24 };

export const firstResponseDueAt = (priority, from = new Date()) =>
  new Date(from.getTime() + SLA_HOURS[priority] * 60 * 60 * 1000);