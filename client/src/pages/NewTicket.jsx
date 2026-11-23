import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, errMsg } from "../lib/api";

export default function NewTicket() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({ subject: "", body: "", priority: "medium" });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const create = useMutation({
    mutationFn: () => api.post("/tickets", form).then((r) => r.data.ticket),
    onSuccess: (ticket) => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      navigate(`/tickets/${ticket._id}`);
    },
  });

  return (
    <div className="card">
      <h2>New ticket</h2>
      <form
        className="stack"
        onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
      >
        <input placeholder="Subject" value={form.subject} onChange={set("subject")} minLength={3} maxLength={150} required />
        <select value={form.priority} onChange={set("priority")}>
          {["low", "medium", "high", "urgent"].map((p) => <option key={p}>{p}</option>)}
        </select>
        <textarea placeholder="Describe the problem" value={form.body} onChange={set("body")} required />
        {create.isError && <div className="error">{errMsg(create.error)}</div>}
        <button className="btn" disabled={create.isPending}>
          {create.isPending ? "Submitting…" : "Submit ticket"}
        </button>
      </form>
    </div>
  );
}