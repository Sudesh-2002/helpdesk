import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import AuthPage from "./pages/AuthPage";
import Tickets from "./pages/Tickets";
import NewTicket from "./pages/NewTicket";
import TicketDetail from "./pages/TicketDetail";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Tickets />} />
        <Route
          path="tickets/new"
          element={<ProtectedRoute roles={["customer"]}><NewTicket /></ProtectedRoute>}
        />
        <Route path="tickets/:id" element={<TicketDetail />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}