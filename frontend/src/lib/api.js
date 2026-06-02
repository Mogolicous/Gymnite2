import axios from "axios";

export const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/+$/, "");
export const API = BACKEND_URL ? `${BACKEND_URL}/api` : "/api";

const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

export default api;

export function formatApiError(err) {
  if (err?.message === "Network Error") {
    return "El servidor se está reiniciando o actualizando. Por favor, espera 1 o 2 minutos e intenta de nuevo.";
  }
  
  const detail = err?.response?.data?.detail;
  if (detail == null) return err?.message || "Algo salió mal. Intenta de nuevo.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}
