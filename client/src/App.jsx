import { useEffect, useState } from "react";
import axios from "axios";

export default function App() {
  const [status, setStatus] = useState("checking...");

  useEffect(() => {
    axios
      .get("/api/health")
      .then((res) => setStatus(res.data.status))
      .catch(() => setStatus("API unreachable"));
  }, []);

  return <h1>Helpdesk API: {status}</h1>;
}