import TicketEvent from "../models/TicketEvent.js";

export const logEvent = (ticket, actor, type, meta = {}) =>
  TicketEvent.create({ ticket, actor, type, meta });