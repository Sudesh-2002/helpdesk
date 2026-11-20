export const rooms = {
  staff: "staff",
  user: (id) => `user:${id}`,
  ticket: (id) => `ticket:${id}`,
  ticketStaff: (id) => `ticket:${id}:staff`, // internal notes only
};