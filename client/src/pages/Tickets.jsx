import { Link, useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api, errMsg } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/StatusBadge";

export default function Tickets() {
  const { user } = useAuth();
  const staff = user.role !== "customer";
  const [params, setParams] = useSearchParams();

  const status = params.get("status") || "";
  const assignee = params.get("assignee") || "";
  const page = Number(params.get("page") || 1);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    next.delete("page");
    setParams(next);
  };

  const setPage = (p) => {
    const next = new URLSearchParams(params);
    next.set("page", p);
    setParams(next);
  };

  const { data, isLoading, error, isPlaceholderData } = useQuery({
    queryKey: ["tickets", { status, assignee, page }],
    queryFn: () =>
      api
        .get("/tickets", { params: { status: status || undefined, assignee: assignee || undefined, page } })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <div className="row between" style={{ marginBottom: "1rem" }}>
        <h2 style={{ margin: 0 }}>{staff ? "Ticket queue" : "My tickets"}</h2>
        {!staff && <Link to="/tickets/new" className="btn">New ticket</Link>}
      </div>

      <div className="card row">
        <select value={status} onChange={(e) => setFilter("status", e.target.value)}>
          <option value="">All statuses</option>
          {["open", "pending", "resolved", "closed"].map((s) => <option key={s}>{s}</option>)}
        </select>
        {staff && (
          <select value={assignee} onChange={(e) => setFilter("assignee", e.target.value)}>
            <option value="">All tickets</option>
            <option value="unassigned">Unassigned</option>
            <option value="me">Assigned to me</option>
          </select>
        )}
      </div>

      <div className="card" style={{ opacity: isPlaceholderData ? 0.6 : 1 }}>
        {isLoading && <p>Loading…</p>}
        {error && <p className="error">{errMsg(error)}</p>}
        {data && data.tickets.length === 0 && <p className="muted">No tickets found.</p>}
        {data && data.tickets.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                {staff && <th>Customer</th>}
                <th>Status</th>
                <th>Priority</th>
                <th>Assignee</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {data.tickets.map((t) => (
                <tr key={t._id}>
                  <td><Link to={`/tickets/${t._id}`}>{t.subject}</Link></td>
                  {staff && <td>{t.customer?.name}</td>}
                  <td><StatusBadge value={t.status} /></td>
                  <td><StatusBadge value={t.priority} /></td>
                  <td>{t.assignee?.name || <span className="muted">Unassigned</span>}</td>
                  <td className="muted">{new Date(t.lastMessageAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data && data.pages > 1 && (
        <div className="row">
          <button className="btn ghost" style={{ color: "#111" }} disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
          <span className="muted">Page {data.page} of {data.pages}</span>
          <button className="btn ghost" style={{ color: "#111" }} disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </>
  );
}