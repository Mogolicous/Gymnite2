import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { formatApiError } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { LOGO_URL } from "@/lib/brand";
import { toast } from "sonner";
import api from "@/lib/api";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Token inválido o no encontrado en la URL.");
    }
  }, [token]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;
    
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: password });
      toast.success("Contraseña actualizada exitosamente");
      navigate("/login");
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 gn-radial relative">
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-purple-600/10 rounded-full blur-[140px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-md"
      >
        <Link to="/" className="flex items-center gap-3 mb-8 justify-center">
          <img
            src={LOGO_URL}
            alt="GymNite"
            className="h-16 w-16 object-contain drop-shadow-[0_0_22px_rgba(168,85,247,0.5)]"
          />
          <span className="text-xl font-semibold">
            Gym<span className="text-purple-400">Nite</span>
          </span>
        </Link>

        <div className="gn-card p-8">
          <h1 className="text-2xl font-bold mb-1">Nueva Contraseña</h1>
          <p className="text-sm text-zinc-400 mb-7">Ingresa tu nueva contraseña para acceder.</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2 block">
                Contraseña
              </label>
              <input
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all"
              />
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !token}
              className="gn-btn-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Actualizando..." : "Cambiar contraseña"}
            </button>
          </form>
          
          <p className="text-sm text-zinc-500 text-center mt-6">
            <Link to="/login" className="text-purple-400 hover:text-purple-300">
              Volver al inicio de sesión
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
