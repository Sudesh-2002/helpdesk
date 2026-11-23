import { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { socket } from "../lib/socket";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const qc = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // restore session from the httpOnly cookie
  useEffect(() => {
    api.get("/auth/me")
      .then((r) => setUser(r.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // socket lifecycle follows the session
  useEffect(() => {
    if (user) socket.connect();
    else socket.disconnect();
  }, [user]);

  const login = async (email, password) => {
    const r = await api.post("/auth/login", { email, password });
    setUser(r.data.user);
  };

  const register = async (name, email, password) => {
    const r = await api.post("/auth/register", { name, email, password });
    setUser(r.data.user);
  };

  const logout = async () => {
    await api.post("/auth/logout");
    setUser(null);
    qc.clear(); // don't leak the previous user's cached tickets to the next login
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}