import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { errMsg } from "../lib/api";

export default function AuthPage({ mode }) {
  const isLogin = mode === "login";
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (isLogin) await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
      navigate(location.state?.from?.pathname || "/", { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card auth">
      <h2>{isLogin ? "Log in" : "Create account"}</h2>
      <form className="stack" onSubmit={submit}>
        {!isLogin && <input placeholder="Name" value={form.name} onChange={set("name")} required />}
        <input type="email" placeholder="Email" value={form.email} onChange={set("email")} required />
        <input
          type="password"
          placeholder="Password (min 8 chars)"
          value={form.password}
          onChange={set("password")}
          minLength={8}
          required
        />
        {error && <div className="error">{error}</div>}
        <button className="btn" disabled={busy}>{busy ? "Please wait…" : isLogin ? "Log in" : "Register"}</button>
      </form>
      <p className="muted">
        {isLogin ? <>No account? <Link to="/register">Register</Link></> : <>Have an account? <Link to="/login">Log in</Link></>}
      </p>
    </div>
  );
}