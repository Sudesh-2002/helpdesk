export const isStaff = (user) => user.role === "agent" || user.role === "admin";

export const canViewTicket = (user, ticket) =>
  isStaff(user) || ticket.customer.equals(user._id);