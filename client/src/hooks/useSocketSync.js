import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { socket } from "../lib/socket";
import { useToast } from "../context/ToastContext";

export function useSocketSync() {
  const qc = useQueryClient();
  const addToast = useToast();
  const { pathname } = useLocation();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    const refetchAll = () => qc.invalidateQueries();
    const refetchLists = () => qc.invalidateQueries({ queryKey: ["tickets"] });

    const onNotification = (n) => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      if (n.type === "sla_breach") return; // the sla:breached event shows this alert
      if (pathRef.current === `/tickets/${n.ticket}`) return; // already looking at it
      addToast({ text: n.text, to: `/tickets/${n.ticket}` });
    };

    const onBreach = (t) => {
      refetchLists();
      addToast({ text: `SLA breached: ${t.subject}`, to: `/tickets/${t._id}`, kind: "danger" });
    };

    socket.on("connect", refetchAll);
    socket.on("ticket:created", refetchLists);
    socket.on("ticket:updated", refetchLists);
    socket.on("notification:new", onNotification);
    socket.on("sla:breached", onBreach);

    return () => {
      socket.off("connect", refetchAll);
      socket.off("ticket:created", refetchLists);
      socket.off("ticket:updated", refetchLists);
      socket.off("notification:new", onNotification);
      socket.off("sla:breached", onBreach);
    };
  }, [qc, addToast]);
}