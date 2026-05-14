import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import api, { formatApiError } from "@/lib/api";
import { Upload, CheckCircle2, Clock, AlertCircle, FileImage, Loader2 } from "lucide-react";
import { toast } from "sonner";

const STATUS_META = {
  no_subscribed: {
    label: "No Suscrito",
    pill: "bg-zinc-500/10 text-zinc-300 border-zinc-500/20",
    icon: AlertCircle,
    iconColor: "text-zinc-400",
    title: "Completa tu inscripción",
    desc: "Sube tu comprobante de pago para que un administrador valide tu cuenta.",
  },
  pending: {
    label: "Pendiente de Verificación",
    pill: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    icon: Clock,
    iconColor: "text-amber-300",
    title: "Comprobante en revisión",
    desc: "Tu pago ya fue recibido. Un administrador lo verificará pronto.",
  },
  subscribed: {
    label: "Suscrito",
    pill: "bg-purple-500/10 text-purple-300 border-purple-500/20",
    icon: CheckCircle2,
    iconColor: "text-purple-300",
    title: "¡Estás dentro!",
    desc: "Tu suscripción está activa. Disfruta de todos los beneficios GymNite.",
  },
};

export default function Dashboard() {
  const { user, setUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const inputRef = useRef(null);

  const meta = STATUS_META[user?.status] || STATUS_META.no_subscribed;
  const StatusIcon = meta.icon;

  const onPick = () => inputRef.current?.click();

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/(jpg|jpeg)$/i.test(f.name) && !["image/jpeg", "image/jpg"].includes(f.type)) {
      toast.error("Solo se permiten imágenes JPG.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("La imagen no debe superar 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setPreview({ name: f.name, dataUrl: ev.target.result, file: f });
    reader.readAsDataURL(f);
  };

  const onUpload = async () => {
    if (!preview?.file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", preview.file);
      const { data } = await api.post("/receipts/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUser(data);
      setPreview(null);
      toast.success("Comprobante enviado. Esperando aprobación.");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white" data-testid="dashboard-page">
      <Navbar />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-600/8 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-6 pt-32 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-purple-400/80 mb-3">
            Mi Cuenta
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Hola, <span className="text-purple-400">{user?.name?.split(" ")[0]}</span>.
          </h1>
          <p className="mt-3 text-zinc-400">{meta.desc}</p>
        </motion.div>

        {/* Status card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mt-10 gn-card p-8"
          data-testid="status-card"
        >
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-5">
              <div className={`h-14 w-14 rounded-2xl flex items-center justify-center border ${user?.status === "subscribed" ? "border-purple-500/30 bg-purple-500/10 shadow-[0_0_30px_rgba(168,85,247,0.25)]" : user?.status === "pending" ? "border-amber-500/30 bg-amber-500/10" : "border-zinc-700 bg-zinc-800/40"}`}>
                <StatusIcon className={`h-6 w-6 ${meta.iconColor}`} strokeWidth={1.5} />
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-zinc-500 mb-1">
                  Estado actual
                </div>
                <div className="text-xl font-semibold">{meta.title}</div>
              </div>
            </div>
            <span
              className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-medium border ${meta.pill}`}
              data-testid="status-badge"
            >
              {meta.label}
            </span>
          </div>
        </motion.div>

        {/* Upload section */}
        {user?.status !== "subscribed" && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-8 gn-card p-8"
            data-testid="upload-section"
          >
            <div className="flex items-center gap-3 mb-5">
              <FileImage className="h-5 w-5 text-purple-300" />
              <h2 className="text-xl font-semibold">Comprobante de pago</h2>
            </div>
            <p className="text-sm text-zinc-400 mb-6">
              Sube una imagen JPG de tu comprobante de transferencia o pago. Máximo 5MB.
              {user?.status === "pending" && (
                <span className="block mt-2 text-amber-300/90">
                  Ya tienes un comprobante en revisión. Puedes subir uno nuevo si lo necesitas.
                </span>
              )}
            </p>

            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/jpg,.jpg,.jpeg"
              onChange={onFile}
              className="hidden"
              data-testid="receipt-file-input"
            />

            {preview ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950">
                  <img src={preview.dataUrl} alt="preview" className="w-full h-72 object-contain bg-black" data-testid="receipt-preview" />
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Archivo</div>
                    <div className="text-sm text-zinc-200 break-all">{preview.name}</div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={onUpload}
                      disabled={uploading}
                      className="gn-btn-primary inline-flex items-center gap-2 disabled:opacity-60"
                      data-testid="receipt-submit-btn"
                    >
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {uploading ? "Subiendo..." : "Enviar comprobante"}
                    </button>
                    <button
                      onClick={() => setPreview(null)}
                      disabled={uploading}
                      className="rounded-full border border-zinc-800 hover:border-zinc-600 px-6 py-3 text-sm text-zinc-300 hover:text-white transition-colors disabled:opacity-60"
                      data-testid="receipt-cancel-btn"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={onPick}
                className="w-full border-2 border-dashed border-zinc-800 hover:border-purple-500/50 rounded-2xl py-14 transition-all group hover:bg-purple-500/5"
                data-testid="receipt-pick-btn"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="h-14 w-14 rounded-2xl bg-zinc-900 border border-zinc-800 group-hover:border-purple-500/40 flex items-center justify-center transition-all">
                    <Upload className="h-5 w-5 text-zinc-400 group-hover:text-purple-300" />
                  </div>
                  <div className="text-zinc-200 font-medium">Selecciona un archivo JPG</div>
                  <div className="text-xs text-zinc-500">
                    Haz click o arrastra una imagen. Máximo 5MB.
                  </div>
                </div>
              </button>
            )}
          </motion.div>
        )}

        {/* Account info */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-8 gn-card p-8"
          data-testid="account-info"
        >
          <h3 className="text-lg font-semibold mb-5">Información de la cuenta</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div>
              <div className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Nombre</div>
              <div className="text-zinc-100">{user?.name}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Email</div>
              <div className="text-zinc-100">{user?.email}</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
