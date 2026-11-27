import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocketSync } from "../hooks/useSocketSync";
import NotificationBell from "./NotificationBell";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  useSocketSync();

  return (
    <>
      <header className="nav">
        <div className="container bar">
          <Link to="/" className="brand">Helpdesk</Link>
          <div className="right">
            <NotificationBell />
            <span>{user.name} <em className="muted">({user.role})</em></span>
            <button
              className="btn ghost"
              onClick={async () => { await logout(); navigate("/login"); }}
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="container"><Outlet /></main>
    </>
  );
}