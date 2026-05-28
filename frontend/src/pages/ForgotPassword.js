import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { formatApiError } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { LOGO_URL } from "@/lib/brand";
import { toast } from "sonner";
import api from "@/lib/api";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState("email"); // "email" | "code"
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onEmailSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim() });
      setStep("code");
      toast.success("Código enviado a tu correo");
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const onCodeSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (code.length !== 6) {
      setError("El código debe tener 6 dígitos.");
      return;
    }
    if (newPassword.length < 5) {
      setError("La contraseña debe tener al menos 5 caracteres.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", { 
        email: email.trim(), 
        code, 
        new_password: newPassword 
      });
      toast.success("Contraseña actualizada exitosamente");
      navigate("/login");
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 gn-radial relative overflow-hidden">
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
          
          <AnimatePresence mode="wait">
            {step === "email" ? (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <p className="text-sm text-zinc-400 mb-7">Ingresa tu correo y te enviaremos un código de 6 dígitos.</p>
                <form onSubmit={onEmailSubmit} className="space-y-4">
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
                    {loading ? "Enviando..." : "Enviar código"}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="code"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <p className="text-sm text-zinc-400 mb-7">Hemos enviado un código de 6 dígitos a <span className="text-white font-medium">{email}</span></p>
                <form onSubmit={onCodeSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2 block">
                      Código de 6 dígitos
                    </label>
                    <input
                      name="code"
                      type="text"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                      required
                      placeholder="000000"
                      className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-3 text-center text-3xl tracking-[0.5em] text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2 block">
                      Nueva Contraseña
                    </label>
                    <input
                      name="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
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
                    disabled={loading || code.length !== 6 || newPassword.length < 5}
                    className="gn-btn-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {loading ? "Actualizando..." : "Restablecer Contraseña"}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

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
