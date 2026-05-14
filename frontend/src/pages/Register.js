import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { Dumbbell, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await register(form.name.trim(), form.email.trim(), form.password);
      toast.success("¡Cuenta creada! Bienvenido a GymNite.");
      navigate(user.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 gn-radial relative" data-testid="register-page">
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-purple-600/10 rounded-full blur-[140px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-md"
      >
        <Link to="/" className="flex items-center gap-2 mb-8 justify-center" data-testid="register-logo">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.4)]">
            <Dumbbell className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-semibold">
            Gym<span className="text-purple-400">Nite</span>
          </span>
        </Link>

        <div className="gn-card p-8">
          <h1 className="text-2xl font-bold mb-1">Crea tu cuenta</h1>
          <p className="text-sm text-zinc-400 mb-7">Únete a la comunidad nocturna.</p>

          <form onSubmit={onSubmit} className="space-y-4" data-testid="register-form">
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2 block">
                Nombre
              </label>
              <input
                name="name"
                value={form.name}
                onChange={onChange}
                required
                minLength={2}
                placeholder="Tu nombre completo"
                className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all"
                data-testid="register-name-input"
              />
            </div>

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
                data-testid="register-email-input"
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
                minLength={5}
                placeholder="••••••••"
                className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all"
                data-testid="register-password-input"
              />
            </div>

            {error && (
              <div
                className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
                data-testid="register-error"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="gn-btn-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              data-testid="register-submit-btn"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Creando..." : "Registrarme"}
            </button>
          </form>

          <p className="text-sm text-zinc-500 text-center mt-6">
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" className="text-purple-400 hover:text-purple-300" data-testid="register-to-login">
              Inicia sesión
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
