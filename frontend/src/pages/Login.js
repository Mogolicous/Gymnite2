import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { LOGO_URL } from "@/lib/brand";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(form.email.trim(), form.password);
      toast.success("Sesión iniciada");
      navigate(user.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 gn-radial relative" data-testid="login-page">
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-purple-600/10 rounded-full blur-[140px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-md"
      >
        <Link to="/" className="flex items-center gap-3 mb-8 justify-center" data-testid="login-logo">
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
          <h1 className="text-2xl font-bold mb-1">Bienvenido</h1>
          <p className="text-sm text-zinc-400 mb-7">Inicia sesión en tu cuenta.</p>

          <form onSubmit={onSubmit} className="space-y-4" data-testid="login-form">
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2 block">
                Email
              </label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={onChange}
                required
                placeholder="tu@correo.com"
                className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all"
                data-testid="login-email-input"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2 block">
                Contraseña
              </label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={onChange}
                required
                placeholder="••••••••"
                className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all"
                data-testid="login-password-input"
              />
              <div className="flex justify-end mt-2">
                <Link to="/forgot-password" className="text-xs text-purple-400 hover:text-purple-300">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>

            {error && (
              <div
                className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
                data-testid="login-error"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="gn-btn-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              data-testid="login-submit-btn"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Ingresando..." : "Iniciar sesión"}
            </button>
          </form>

          <p className="text-sm text-zinc-500 text-center mt-6">
            ¿No tienes cuenta?{" "}
            <Link to="/register" className="text-purple-400 hover:text-purple-300" data-testid="login-to-register">
              Regístrate
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
