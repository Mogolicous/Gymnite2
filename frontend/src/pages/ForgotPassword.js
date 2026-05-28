import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { formatApiError } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { LOGO_URL } from "@/lib/brand";
import { toast } from "sonner";
import api from "@/lib/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim() });
      setSuccess(true);
      toast.success("Enlace de recuperación enviado");
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
          <h1 className="text-2xl font-bold mb-1">Recuperar Contraseña</h1>
          
          {success ? (
            <div className="text-center mt-6">
              <div className="bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl p-4 mb-6 text-sm">
                Si el correo electrónico está registrado, recibirás un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada o la carpeta de spam.
              </div>
              <Link to="/login" className="gn-btn-primary w-full inline-block">
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-zinc-400 mb-7">Ingresa tu correo y te enviaremos un enlace.</p>
              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2 block">
                    Email
                  </label>
                  <input
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="tu@correo.com"
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
                  disabled={loading}
                  className="gn-btn-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {loading ? "Enviando..." : "Enviar enlace"}
                </button>
              </form>
              
              <p className="text-sm text-zinc-500 text-center mt-6">
                <Link to="/login" className="text-purple-400 hover:text-purple-300">
                  Volver atrás
                </Link>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
