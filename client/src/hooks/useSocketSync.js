import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socket } from "../lib/socket";

export function useSocketSync() {
  const qc = useQueryClient();

  useEffect(() => {
    // on every (re)connect refetch everything, which replays anything missed while offline
    const refetchAll = () => qc.invalidateQueries();
    const refetchLists = () => qc.invalidateQueries({ queryKey: ["tickets"] });

    socket.on("connect", refetchAll);
    socket.on("ticket:created", refetchLists);
    socket.on("ticket:updated", refetchLists);

    return () => {
      socket.off("connect", refetchAll);
      socket.off("ticket:created", refetchLists);
      socket.off("ticket:updated", refetchLists);
    };
  }, [qc]);
}