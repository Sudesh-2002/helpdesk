import { useEffect, useRef, useCallback } from "react";
import { socket } from "../lib/socket";

export function useTicketRoom(ticketId, { onMessage, onTicket, onTyping } = {}) {
  const handlers = useRef({});
  handlers.current = { onMessage, onTicket, onTyping };

  useEffect(() => {
    if (!ticketId) return;

    const join = () =>
      socket.emit("ticket:join", ticketId, (res) => {
        if (!res?.ok) console.error("join failed:", res?.error);
      });

    const handleMessage = (m) => m.ticket === ticketId && handlers.current.onMessage?.(m);
    const handleTicket = (t) => t._id === ticketId && handlers.current.onTicket?.(t);
    const handleTyping = (t) => t.ticketId === ticketId && handlers.current.onTyping?.(t);

    socket.on("connect", join);
    socket.on("message:new", handleMessage);
    socket.on("ticket:updated", handleTicket);
    socket.on("typing", handleTyping);

    if (socket.connected) join();
    else socket.connect();

    return () => {
      socket.emit("ticket:leave", ticketId);
      socket.off("connect", join);
      socket.off("message:new", handleMessage);
      socket.off("ticket:updated", handleTicket);
      socket.off("typing", handleTyping);
    };
  }, [ticketId]);

  const sendTyping = useCallback(
    (isTyping) => socket.emit("typing", { ticketId, isTyping }),
    [ticketId]
  );

  return { sendTyping };
}