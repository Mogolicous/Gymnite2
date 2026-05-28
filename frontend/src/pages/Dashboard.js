import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import AttendanceSection from "@/components/AttendanceSection";
import PhysicalEvaluationSection from "@/components/PhysicalEvaluationSection";
import RoutineSection from "@/components/RoutineSection";
import BookingSection from "@/components/BookingSection";
import { useAuth } from "@/context/AuthContext";
import api, { formatApiError } from "@/lib/api";
import { PLAN_TIERS, BANK_INFO, planByMonthsAndType } from "@/lib/plans";
import {
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileImage,
  Loader2,
  Copy,
  Check,
  Sparkles,
  ArrowLeft,
  X,
  PartyPopper,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_META = {
  no_subscribed: {
    label: "No Suscrito",
    pill: "bg-zinc-500/10 text-zinc-300 border-zinc-500/20",
    icon: AlertCircle,
    iconColor: "text-zinc-400",
    title: "Elige tu plan",
    desc: "Selecciona la duración que mejor se adapte a ti.",
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

function CopyableField({ label, value, testId }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copiado`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("No se pudo copiar");
    }
  };
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-zinc-800/70 last:border-0" data-testid={testId}>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">{label}</div>
        <div className="text-sm text-zinc-100 truncate">{value}</div>
      </div>
      <button
        onClick={onCopy}
        className="shrink-0 inline-flex items-center gap-1 rounded-full border border-zinc-800 hover:border-purple-500/50 px-3 py-1.5 text-xs text-zinc-300 hover:text-white transition-colors"
        data-testid={`${testId}-copy`}
      >
        {copied ? <Check className="h-3 w-3 text-purple-300" /> : <Copy className="h-3 w-3" />}
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}

function PlanCard({ tier, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(tier)}
      className={`relative text-left gn-card p-6 transition-all duration-300 hover:-translate-y-1 ${
        selected
          ? "border-purple-500/60 shadow-[0_0_40px_rgba(168,85,247,0.25)]"
          : "hover:border-purple-500/30"
      } ${tier.popular ? "ring-1 ring-purple-500/30" : ""}`}
      data-testid={`plan-card-${tier.months}`}
    >
      {tier.popular && (
        <span className="absolute -top-3 left-6 inline-flex items-center gap-1 bg-purple-500 text-white text-[10px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full shadow-[0_0_20px_rgba(168,85,247,0.6)]">
          <Sparkles className="h-3 w-3" /> Popular
        </span>
      )}
      <div className="text-2xl font-bold text-white">{tier.label}</div>
      <div className="mt-5 flex items-baseline gap-1">
        <span className="text-4xl font-bold text-white">${tier.price}</span>
        <span className="text-sm text-zinc-500">USD</span>
      </div>
      {tier.saving && (
        <div className="mt-2 text-xs text-purple-300/90">{tier.saving}</div>
      )}
      <div
        className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-medium border transition-all ${
          selected
            ? "bg-purple-500 border-purple-400 text-white shadow-[0_0_25px_rgba(168,85,247,0.55)]"
            : "border-zinc-800 text-zinc-300 hover:border-purple-500/40"
        }`}
      >
        {selected ? "Seleccionado" : "Elegir"}
      </div>
    </button>
  );
}

export default function Dashboard() {
  const { user, setUser } = useAuth();
  const [selected, setSelected] = useState(null); // { months: X, type: 'pesas' }
  const [selectedCategory, setSelectedCategory] = useState("pesas");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [dismissing, setDismissing] = useState(false);
  const inputRef = useRef(null);

  const status = user?.status || "no_subscribed";
  const meta = STATUS_META[status];
  const StatusIcon = meta.icon;
  const adminAction = user?.last_admin_action; // "approved" | "rejected" | null

  const dismissNotification = async () => {
    setDismissing(true);
    try {
      const { data } = await api.post("/me/dismiss-notification");
      setUser(data);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setDismissing(false);
    }
  };

  // If status is pending, show user the previously requested plan as the default.
  const requestedPlan = planByMonthsAndType(user?.requested_plan_months, user?.requested_plan_type || "pesas");

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!["image/jpeg", "image/jpg"].includes(f.type)) {
      toast.error("Solo se permiten imágenes JPG.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("La imagen no debe superar 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) =>
      setPreview({ name: f.name, dataUrl: ev.target.result, file: f });
    reader.readAsDataURL(f);
  };

  const onUpload = async () => {
    if (!preview?.file || !selected) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", preview.file);
      fd.append("plan_months", String(selected.months));
      fd.append("plan_type", selected.type);
      const { data } = await api.post("/receipts/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUser(data);
      setPreview(null);
      setSelected(null);
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

      <div className="relative max-w-6xl mx-auto px-6 pt-32 pb-16">
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

        {/* Admin action notification */}
        {adminAction === "approved" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 relative overflow-hidden rounded-2xl border border-purple-500/40 bg-gradient-to-br from-purple-600/15 via-purple-500/8 to-fuchsia-500/10 shadow-[0_0_40px_rgba(168,85,247,0.25)]"
            data-testid="admin-alert-approved"
          >
            <div className="absolute -top-10 -right-10 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="relative p-6 flex items-start gap-4">
              <div className="shrink-0 h-12 w-12 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center">
                <PartyPopper className="h-5 w-5 text-purple-200" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold uppercase tracking-widest text-purple-300/90 mb-1">
                  ¡Comprobante aprobado!
                </div>
                <p className="text-zinc-100 font-medium">
                  Tu suscripción está activa. ¡Bienvenido al equipo GymNite!
                </p>
                <p className="text-sm text-zinc-400 mt-1">
                  Ya puedes asistir en cualquier horario disponible.
                </p>
              </div>
              <button
                onClick={dismissNotification}
                disabled={dismissing}
                aria-label="Descartar notificación"
                className="shrink-0 text-zinc-500 hover:text-white transition-colors disabled:opacity-50"
                data-testid="dismiss-notification-btn"
              >
                {dismissing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-5 w-5" />
                )}
              </button>
            </div>
          </motion.div>
        )}

        {adminAction === "rejected" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 relative overflow-hidden rounded-2xl border border-red-500/40 bg-red-500/10"
            data-testid="admin-alert-rejected"
          >
            <div className="p-6 flex items-start gap-4">
              <div className="shrink-0 h-12 w-12 rounded-2xl bg-red-500/15 border border-red-400/40 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold uppercase tracking-widest text-red-300/90 mb-1">
                  Comprobante rechazado
                </div>
                <p className="text-zinc-100 font-medium">
                  Tu comprobante no pudo ser validado.
                </p>
                <p className="text-sm text-zinc-400 mt-1">
                  Revisa que la imagen sea legible, muestre el monto correcto y vuelve a subir uno nuevo.
                </p>
              </div>
              <button
                onClick={dismissNotification}
                disabled={dismissing}
                aria-label="Descartar notificación"
                className="shrink-0 text-zinc-500 hover:text-white transition-colors disabled:opacity-50"
                data-testid="dismiss-notification-btn"
              >
                {dismissing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-5 w-5" />
                )}
              </button>
            </div>
          </motion.div>
        )}

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
              <div
                className={`h-14 w-14 rounded-2xl flex items-center justify-center border ${
                  status === "subscribed"
                    ? "border-purple-500/30 bg-purple-500/10 shadow-[0_0_30px_rgba(168,85,247,0.25)]"
                    : status === "pending"
                    ? "border-amber-500/30 bg-amber-500/10"
                    : "border-zinc-700 bg-zinc-800/40"
                }`}
              >
                <StatusIcon className={`h-6 w-6 ${meta.iconColor}`} strokeWidth={1.5} />
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-zinc-500 mb-1">
                  Estado actual
                </div>
                <div className="text-xl font-semibold">{meta.title}</div>
                {status === "subscribed" && user?.plan_months && (
                  <div className="text-sm text-zinc-400 mt-1">
                    Plan {user.plan_months} {user.plan_months === 1 ? "mes" : "meses"} ·
                    vence{" "}
                    {user.plan_expires_at
                      ? new Date(user.plan_expires_at).toLocaleDateString("es-ES", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </div>
                )}
                {status === "pending" && requestedPlan && (
                  <div className="text-sm text-zinc-400 mt-1">
                    Plan solicitado: {requestedPlan.label} · ${requestedPlan.price}
                  </div>
                )}
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

        {/* Plan tiers + Payment flow (only for non-subscribed) */}
        {status !== "subscribed" && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-10"
          >
            <AnimatePresence mode="wait">
              {!selected ? (
                <motion.div
                  key="plans"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                  data-testid="plans-section"
                >
                  <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-purple-400/80 mb-2">
                        Planes
                      </p>
                      <h2 className="text-3xl font-bold tracking-tight">
                        Elige tu duración
                      </h2>
                    </div>
                    <span className="text-xs text-zinc-500">
                      Pago único por transferencia · sin permanencia
                    </span>
                  </div>

                  {/* CATEGORY TABS */}
                  <div className="flex items-center gap-4 border-b border-zinc-800 mb-6 pb-0 overflow-x-auto scrollbar-hide">
                    {[
                      { id: "pesas", label: "Gym (Pesas)" },
                      { id: "clases", label: "Clases (Box)" },
                      { id: "premium", label: "Premium (Todo)" },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`pb-3 px-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                          selectedCategory === cat.id
                            ? "border-purple-500 text-purple-400"
                            : "border-transparent text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {PLAN_TIERS[selectedCategory].map((t) => (
                      <PlanCard
                        key={t.months}
                        tier={t}
                        selected={false}
                        onSelect={setSelected}
                      />
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="payment"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                  data-testid="payment-section"
                >
                  <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                    <button
                      onClick={() => {
                        setSelected(null);
                        setPreview(null);
                      }}
                      className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
                      data-testid="payment-back-btn"
                    >
                      <ArrowLeft className="h-4 w-4" /> Cambiar plan
                    </button>
                    <span className="text-xs uppercase tracking-widest text-zinc-500">
                      Paso 2 de 2
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Bank info */}
                    <div className="lg:col-span-2 gn-card p-7" data-testid="bank-info-card">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold uppercase tracking-widest text-purple-400/80">
                          Datos para la transferencia
                        </p>
                      </div>
                      <h3 className="text-2xl font-bold mb-1">
                        {selected.label} · ${selected.price}
                      </h3>
                      <p className="text-sm text-zinc-500 mb-6">
                        Transfiere el monto y luego sube el comprobante.
                      </p>
                      <div className="rounded-xl bg-zinc-950/60 border border-zinc-800 px-5">
                        <CopyableField label="Banco" value={BANK_INFO.bank} testId="bank-name" />
                        <CopyableField
                          label="Número de cuenta"
                          value={BANK_INFO.account_number}
                          testId="bank-account"
                        />
                        <CopyableField
                          label="Titular"
                          value={BANK_INFO.holder}
                          testId="bank-holder"
                        />
                        <CopyableField
                          label="Correo"
                          value={BANK_INFO.email}
                          testId="bank-email"
                        />
                        <CopyableField
                          label="Monto a transferir"
                          value={`$${selected.price} USD`}
                          testId="bank-amount"
                        />
                      </div>
                      <div className="mt-5 flex items-start gap-3 text-xs text-zinc-500 leading-relaxed">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-amber-300/80" />
                        <span>
                          Asegúrate de transferir el monto exacto y guardar tu comprobante
                          en formato JPG antes de subirlo.
                        </span>
                      </div>
                    </div>

                    {/* Upload */}
                    <div className="lg:col-span-3 gn-card p-7" data-testid="upload-section">
                      <div className="flex items-center gap-3 mb-2">
                        <FileImage className="h-5 w-5 text-purple-300" />
                        <h3 className="text-xl font-semibold">Sube tu comprobante</h3>
                      </div>
                      <p className="text-sm text-zinc-400 mb-6">
                        Imagen JPG · máximo 5MB. Un administrador validará tu pago.
                      </p>

                      <input
                        ref={inputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,.jpg,.jpeg"
                        onChange={handleFile}
                        className="hidden"
                        data-testid="receipt-file-input"
                      />

                      {preview ? (
                        <div className="space-y-5">
                          <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-black">
                            <img
                              src={preview.dataUrl}
                              alt="preview"
                              className="w-full h-72 object-contain"
                              data-testid="receipt-preview"
                            />
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-widest text-zinc-500 mb-1">
                              Archivo
                            </div>
                            <div className="text-sm text-zinc-200 break-all">
                              {preview.name}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <button
                              onClick={onUpload}
                              disabled={uploading}
                              className="gn-btn-primary inline-flex items-center gap-2 disabled:opacity-60"
                              data-testid="receipt-submit-btn"
                            >
                              {uploading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Upload className="h-4 w-4" />
                              )}
                              {uploading
                                ? "Subiendo..."
                                : `Enviar comprobante · ${selected.label}`}
                            </button>
                            <button
                              onClick={() => setPreview(null)}
                              disabled={uploading}
                              className="rounded-full border border-zinc-800 hover:border-zinc-600 px-6 py-3 text-sm text-zinc-300 hover:text-white transition-colors disabled:opacity-60"
                              data-testid="receipt-cancel-btn"
                            >
                              Cambiar archivo
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => inputRef.current?.click()}
                          className="w-full border-2 border-dashed border-zinc-800 hover:border-purple-500/50 rounded-2xl py-16 transition-all group hover:bg-purple-500/5"
                          data-testid="receipt-pick-btn"
                        >
                          <div className="flex flex-col items-center gap-3">
                            <div className="h-14 w-14 rounded-2xl bg-zinc-900 border border-zinc-800 group-hover:border-purple-500/40 flex items-center justify-center transition-all">
                              <Upload className="h-5 w-5 text-zinc-400 group-hover:text-purple-300" />
                            </div>
                            <div className="text-zinc-200 font-medium">
                              Selecciona un archivo JPG
                            </div>
                            <div className="text-xs text-zinc-500">
                              Haz click o arrastra una imagen. Máximo 5MB.
                            </div>
                          </div>
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Phase 1 & 2 & 3 Features for subscribed users */}
        {status === "subscribed" && (
          <>
            {/* Solo Pesas y Premium ven las rutinas y evaluación */}
            {(user?.plan_type === "pesas" || user?.plan_type === "premium") && (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8"
              >
                <RoutineSection />
                <AttendanceSection />
                <PhysicalEvaluationSection />
              </motion.div>
            )}
            
            {/* Solo Clases y Premium ven el Booking */}
            {(user?.plan_type === "clases" || user?.plan_type === "premium") && (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
              >
                <BookingSection />
              </motion.div>
            )}
          </>
        )}

        {/* Account info */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-10 gn-card p-8"
          data-testid="account-info"
        >
          <h3 className="text-lg font-semibold mb-5">Información de la cuenta</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div>
              <div className="text-xs uppercase tracking-widest text-zinc-500 mb-1">
                Nombre
              </div>
              <div className="text-zinc-100">{user?.name}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-zinc-500 mb-1">
                Email
              </div>
              <div className="text-zinc-100">{user?.email}</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
