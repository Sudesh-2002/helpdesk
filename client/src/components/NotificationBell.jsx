import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export default function NotificationBell() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const boxRef = useRef();

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get("/notifications").then((r) => r.data),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["notifications"] });
  const markRead = useMutation({ mutationFn: (id) => api.patch(`/notifications/${id}/read`), onSuccess: refresh });
  const markAll = useMutation({ mutationFn: () => api.patch("/notifications/read-all"), onSuccess: refresh });

  // close when clicking outside
  useEffect(() => {
    const close = (e) => boxRef.current && !boxRef.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const unread = data?.unread ?? 0;

  const openNotification = (n) => {
    if (!n.readAt) markRead.mutate(n._id);
    setOpen(false);
    navigate(`/tickets/${n.ticket}`);
  };

  return (
    <div className="bell" ref={boxRef}>
      <button className="btn ghost" onClick={() => setOpen(!open)} aria-label="Notifications">
        🔔{unread > 0 && <span className="count">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div className="dropdown">
          <div className="row between dropdown-head">
            <strong>Notifications</strong>
            {unread > 0 && (
              <button className="link" onClick={() => markAll.mutate()}>Mark all read</button>
            )}
          </div>
          {data?.notifications.length === 0 && <p className="muted pad">Nothing yet.</p>}
          {data?.notifications.map((n) => (
            <button
              key={n._id}
              className={`item ${n.readAt ? "" : "unread"} ${n.type === "sla_breach" ? "danger" : ""}`}
              onClick={() => openNotification(n)}
            >
              <div>{n.text}</div>
              <div className="muted">{new Date(n.createdAt).toLocaleString()}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}