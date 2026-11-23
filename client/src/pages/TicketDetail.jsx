import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, errMsg } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useTicketRoom } from "../hooks/useTicketRoom";
import StatusBadge from "../components/StatusBadge";

const STATUSES = ["open", "pending", "resolved", "closed"];

export default function TicketDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const staff = user.role !== "customer";

  const { data, isLoading, error } = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => api.get(`/tickets/${id}`).then((r) => r.data),
    retry: false,
  });

  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [typingName, setTypingName] = useState(null);
  const hideTypingTimer = useRef();
  const stopTypingTimer = useRef();
  const bottomRef = useRef();

  // The sender's own message arrives twice (REST response and socket broadcast), so dedupe by _id
  const addMessage = useCallback(
    (m) =>
      qc.setQueryData(["ticket", id], (old) =>
        !old || old.messages.some((x) => x._id === m._id)
          ? old
          : { ...old, messages: [...old.messages, m] }
      ),
    [qc, id]
  );

  const { sendTyping } = useTicketRoom(id, {
    onMessage: addMessage,
    onTicket: (t) => qc.setQueryData(["ticket", id], (old) => old && { ...old, ticket: t }),
    onTyping: ({ user: u, isTyping }) => {
      clearTimeout(hideTypingTimer.current);
      if (isTyping) {
        setTypingName(u.name);
        hideTypingTimer.current = setTimeout(() => setTypingName(null), 3000); // safety net
      } else {
        setTypingName(null);
      }
    },
  });

  const send = useMutation({
    mutationFn: (payload) => api.post(`/tickets/${id}/messages`, payload).then((r) => r.data.message),
    onSuccess: (m) => {
      addMessage(m);
      setBody("");
      setInternal(false);
      clearTimeout(stopTypingTimer.current);
      sendTyping(false);
    },
  });

  // assign/status responses are unpopulated, so refetch; the socket update also lands populated
  const refresh = () => qc.invalidateQueries({ queryKey: ["ticket", id] });
  const claim = useMutation({ mutationFn: () => api.patch(`/tickets/${id}/assign`), onSuccess: refresh });
  const changeStatus = useMutation({
    mutationFn: (status) => api.patch(`/tickets/${id}/status`, { status }),
    onSuccess: refresh,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages.length, typingName]);

  useEffect(() => () => {
    clearTimeout(hideTypingTimer.current);
    clearTimeout(stopTypingTimer.current);
  }, []);

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p className="error">{errMsg(error)} <Link to="/">Back</Link></p>;

  const { ticket, messages } = data;
  const closed = ticket.status === "closed";
  const overdue =
    staff && !ticket.firstRespondedAt && ticket.firstResponseDueAt &&
    new Date(ticket.firstResponseDueAt) < new Date();

  const onChange = (e) => {
    setBody(e.target.value);
    if (internal) return; // don't tell the customer an internal note is being typed
    sendTyping(true);
    clearTimeout(stopTypingTimer.current);
    stopTypingTimer.current = setTimeout(() => sendTyping(false), 2000);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    send.mutate({ body: body.trim(), isInternal: staff && internal });
  };

  return (
    <>
      <Link to="/">← Back</Link>

      <div className="card" style={{ marginTop: ".75rem" }}>
        <div className="row between">
          <h2 style={{ margin: 0 }}>{ticket.subject}</h2>
          <div className="row">
            <StatusBadge value={ticket.status} />
            <StatusBadge value={ticket.priority} />
          </div>
        </div>
        <p className="muted">
          {staff && <>Customer: {ticket.customer?.name} · </>}
          Assignee: {ticket.assignee?.name || "Unassigned"}
          {staff && ticket.firstResponseDueAt && !ticket.firstRespondedAt && (
            <> · First response due {new Date(ticket.firstResponseDueAt).toLocaleString()}
              {overdue && <strong className="error"> (overdue)</strong>}</>
          )}
        </p>

        <div className="row">
          {staff && !ticket.assignee && (
            <button className="btn" disabled={claim.isPending} onClick={() => claim.mutate()}>
              Claim ticket
            </button>
          )}
          {staff && (
            <select value={ticket.status} onChange={(e) => changeStatus.mutate(e.target.value)}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          )}
          {!staff && !closed && (
            <button className="btn ghost" style={{ color: "#111" }} onClick={() => changeStatus.mutate("closed")}>
              Close ticket
            </button>
          )}
        </div>
        {(claim.isError || changeStatus.isError) && (
          <div className="error">{errMsg(claim.error || changeStatus.error)}</div>
        )}
      </div>

      <div className="card">
        <div className="thread">
          {messages.map((m) => (
            <div
              key={m._id}
              className={`msg ${m.sender._id === user.id ? "mine" : ""} ${m.isInternal ? "internal" : ""}`}
            >
              <div className="meta">
                {m.sender.name} ({m.sender.role}){m.isInternal && " · internal note"} ·{" "}
                {new Date(m.createdAt).toLocaleString()}
              </div>
              {m.body}
            </div>
          ))}
          {typingName && <div className="muted">{typingName} is typing…</div>}
          <div ref={bottomRef} />
        </div>
      </div>

      {closed ? (
        <p className="muted">This ticket is closed.</p>
      ) : (
        <form className="card stack" onSubmit={submit}>
          <textarea
            placeholder={internal ? "Internal note (staff only)" : "Write a reply…"}
            value={body}
            onChange={onChange}
          />
          {send.isError && <div className="error">{errMsg(send.error)}</div>}
          <div className="row between">
            {staff ? (
              <label className="row">
                <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
                Internal note
              </label>
            ) : <span />}
            <button className="btn" disabled={send.isPending || !body.trim()}>Send</button>
          </div>
        </form>
      )}
    </>
  );
}