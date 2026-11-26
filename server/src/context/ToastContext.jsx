import { createContext, useCallback, useContext, useState } from "react";
import { Link } from "react-router-dom";

const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = crypto.randomUUID();
    setToasts((t) => [...t.slice(-3), { id, ...toast }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind || ""}`}>
            {t.to ? <Link to={t.to}>{t.text}</Link> : t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}