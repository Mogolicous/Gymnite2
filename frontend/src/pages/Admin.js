import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import api, { formatApiError } from "@/lib/api";
import {
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  Search,
  Users,
  XCircle,
  AlertCircle,
  ShieldCheck,
  Plus,
  UserPlus,
  Upload,
  ImageOff,
  Calendar,
  Trash2,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { PLAN_TIERS, planByMonths } from "@/lib/plans";
import { toast } from "sonner";
import AdminReservations from "./AdminReservations";

const STATUS_META = {
  no_subscribed: { label: "No Suscrito", pill: "bg-zinc-500/10 text-zinc-300 border-zinc-500/30" },
  pending: { label: "Pendiente", pill: "bg-amber-500/10 text-amber-300 border-amber-500/30" },
  subscribed: { label: "Suscrito", pill: "bg-purple-500/10 text-purple-300 border-purple-500/30" },
};

const PLAN_OPTIONS = PLAN_TIERS.map((t) => t.months);

function StatCard({ icon: Icon, label, value, color, testId }) {
  return (
    <div className="gn-card p-6" data-testid={testId}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">{label}</div>
          <div className="text-3xl font-bold">{value}</div>
        </div>
        <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="h-5 w-5" strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

/* ---------- Approve / Receipt modal ---------- */
function ApprovalModal({ user, onClose, onApprove, onReject, actionLoading }) {
  const [image, setImage] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  // Default to the plan the user requested when uploading the receipt; fallback to 6 months.
  const initialIdx = (() => {
    const requested = user?.requested_plan_months;
    const idx = PLAN_OPTIONS.indexOf(requested);
    return idx >= 0 ? idx : 2;
  })();
  const [planIdx, setPlanIdx] = useState(initialIdx);
  const months = PLAN_OPTIONS[planIdx];
  const requestedTier = planByMonths(user?.requested_plan_months);
  const selectedTier = planByMonths(months);

  useEffect(() => {
    let active = true;
    const fetchImage = async () => {
      if (!user.has_receipt) return;
      setImageLoading(true);
      try {
        const { data } = await api.get(`/admin/users/${user.id}/receipt`);
        if (active) setImage(data.image);
      } catch (err) {
        if (active) toast.error(formatApiError(err));
      } finally {
        if (active) setImageLoading(false);
      }
    };
    fetchImage();
    return () => {
      active = false;
    };
  }, [user.id, user.has_receipt]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
      data-testid="receipt-modal"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-[0_0_40px_rgba(168,85,247,0.18)] max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <div className="text-xs uppercase tracking-widest text-zinc-500">
              Verificación de comprobante
            </div>
            <div className="font-semibold text-lg">{user.name}</div>
            <div className="text-xs text-zinc-500">{user.email || "Sin email · manual"}</div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
            data-testid="modal-close-btn"
          >
            <XCircle className="h-6 w-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 flex-1 overflow-y-auto">
          {/* Receipt preview */}
          <div className="p-6 bg-black flex items-center justify-center min-h-[280px] md:border-r md:border-zinc-900">
            {imageLoading ? (
              <Loader2 className="h-6 w-6 text-purple-400 animate-spin" />
            ) : image ? (
              <img
                src={image}
                alt="Comprobante"
                className="max-h-[60vh] max-w-full object-contain rounded-lg"
                data-testid="receipt-modal-image"
              />
            ) : (
              <div className="flex flex-col items-center text-zinc-600 gap-2" data-testid="receipt-modal-empty">
                <ImageOff className="h-10 w-10" />
                <span className="text-sm">Sin comprobante subido</span>
              </div>
            )}
          </div>

          {/* Approval controls */}
          <div className="p-6 space-y-6">
            <div>
              <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">
                Estado actual
              </div>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${STATUS_META[user.status]?.pill}`}
              >
                {STATUS_META[user.status]?.label}
              </span>
            </div>

            {requestedTier && (
              <div
                className="rounded-xl bg-purple-500/5 border border-purple-500/20 px-4 py-3"
                data-testid="modal-requested-plan"
              >
                <div className="text-[10px] uppercase tracking-widest text-purple-400/80 mb-1">
                  Plan solicitado por el usuario
                </div>
                <div className="text-sm text-zinc-100">
                  <span className="font-semibold">{requestedTier.label}</span> ·{" "}
                  <span className="text-purple-300">${requestedTier.price}</span>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                  Duración del plan
                </label>
                <div
                  className="text-right"
                  data-testid="plan-current-value"
                >
                  <div className="text-3xl font-bold text-purple-300 leading-none gn-glow-text">
                    {months}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">
                    {months === 1 ? "mes" : "meses"}
                  </div>
                </div>
              </div>

              <div className="px-1 pt-2 pb-1" data-testid="plan-slider-wrapper">
                <Slider
                  value={[planIdx]}
                  onValueChange={(v) => setPlanIdx(v[0])}
                  min={0}
                  max={PLAN_OPTIONS.length - 1}
                  step={1}
                  className="[&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:bg-purple-500 [&_[role=slider]]:border-purple-300 [&_[role=slider]]:shadow-[0_0_20px_rgba(168,85,247,0.6)] [&>span:first-child]:bg-zinc-800 [&>span:first-child>span]:bg-gradient-to-r [&>span:first-child>span]:from-purple-500 [&>span:first-child>span]:to-fuchsia-500"
                  data-testid="plan-slider"
                />
                <div className="grid grid-cols-4 mt-3 text-[11px] text-zinc-500 select-none">
                  {PLAN_OPTIONS.map((m, i) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPlanIdx(i)}
                      className={`text-center transition-colors ${
                        i === planIdx ? "text-purple-300 font-semibold" : "hover:text-zinc-300"
                      }`}
                      data-testid={`plan-step-${m}`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 gn-card p-4 flex items-center gap-3" data-testid="plan-summary">
                <Calendar className="h-4 w-4 text-purple-300" />
                <div className="text-xs text-zinc-400 flex-1">
                  Vence el{" "}
                  <span className="text-zinc-100 font-medium">
                    {formatDate(
                      new Date(Date.now() + months * 30 * 86400 * 1000).toISOString()
                    )}
                  </span>
                </div>
                {selectedTier && (
                  <div className="text-xs text-purple-300 font-semibold">
                    ${selectedTier.price}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={() => onApprove(user.id, months)}
                disabled={actionLoading}
                className="gn-btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-60"
                data-testid="modal-approve-btn"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Aprobar suscripción · {months} {months === 1 ? "mes" : "meses"}
              </button>
              {user.status === "pending" && (
                <button
                  onClick={() => onReject(user.id)}
                  disabled={actionLoading}
                  className="rounded-full border border-zinc-800 hover:border-red-500/40 hover:text-red-300 px-5 py-2.5 text-sm text-zinc-300 transition-all disabled:opacity-50"
                  data-testid="modal-reject-btn"
                >
                  Rechazar comprobante
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ---------- Add manual user modal ---------- */
function AddUserModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

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
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      toast.error("Ingresa un nombre válido.");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      if (email.trim()) fd.append("email", email.trim());
      if (file) fd.append("file", file);
      const { data } = await api.post("/admin/users/manual", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(`Usuario "${data.name}" agregado.`);
      onCreated(data);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
      data-testid="add-user-modal"
    >
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-[0_0_40px_rgba(168,85,247,0.18)]"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-purple-300" />
            <div>
              <div className="font-semibold">Agregar usuario manualmente</div>
              <div className="text-xs text-zinc-500">No requiere cuenta · gestión interna</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white"
            data-testid="add-user-close-btn"
          >
            <XCircle className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2 block">
              Nombre <span className="text-red-400">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              placeholder="Nombre completo"
              className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20"
              data-testid="add-user-name-input"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2 block">
              Email <span className="text-zinc-600">(opcional)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="opcional@ejemplo.com"
              className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20"
              data-testid="add-user-email-input"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2 block">
              Comprobante (JPG, opcional)
            </label>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/jpg,.jpg,.jpeg"
              onChange={handleFile}
              className="hidden"
              data-testid="add-user-file-input"
            />
            {preview ? (
              <div className="rounded-xl border border-zinc-800 overflow-hidden">
                <img src={preview} alt="preview" className="w-full h-40 object-contain bg-black" />
                <div className="flex justify-end p-2 bg-zinc-950">
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setPreview(null);
                    }}
                    className="text-xs text-zinc-400 hover:text-red-300"
                    data-testid="add-user-remove-file"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="w-full border border-dashed border-zinc-800 hover:border-purple-500/40 hover:bg-purple-500/5 rounded-xl py-6 transition-all text-sm text-zinc-400 inline-flex items-center justify-center gap-2"
                data-testid="add-user-pick-file"
              >
                <Upload className="h-4 w-4" /> Subir comprobante JPG
              </button>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-zinc-800 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-800 hover:border-zinc-600 px-5 py-2 text-sm text-zinc-300"
            data-testid="add-user-cancel-btn"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="gn-btn-primary inline-flex items-center gap-2 disabled:opacity-60"
            data-testid="add-user-submit-btn"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {loading ? "Creando..." : "Agregar usuario"}
          </button>
        </div>
      </motion.form>
    </div>
  );
}

/* ---------- Admin page ---------- */
export default function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [approvalUser, setApprovalUser] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState(null);
  const [actionId, setActionId] = useState(null);
  const [activeTab, setActiveTab] = useState("users"); // "users" | "reservations"

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/users");
      setUsers(data);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const acc = { total: users.length, no_subscribed: 0, pending: 0, subscribed: 0 };
    users.forEach((u) => {
      acc[u.status] = (acc[u.status] || 0) + 1;
    });
    return acc;
  }, [users]);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchFilter = filter === "all" ? true : u.status === filter;
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }, [users, filter, search]);

  const approve = async (userId, planMonths) => {
    setActionId(userId);
    try {
      const { data } = await api.post(`/admin/users/${userId}/approve`, { plan_months: planMonths });
      setUsers((prev) => prev.map((u) => (u.id === userId ? data : u)));
      toast.success(`${data.name} aprobado por ${planMonths} ${planMonths === 1 ? "mes" : "meses"}.`);
      setApprovalUser(null);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setActionId(null);
    }
  };

  const reject = async (userId) => {
    setActionId(userId);
    try {
      const { data } = await api.post(`/admin/users/${userId}/reject`);
      setUsers((prev) => prev.map((u) => (u.id === userId ? data : u)));
      toast.success("Comprobante rechazado.");
      setApprovalUser(null);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setActionId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteUser) return;
    const userId = deleteUser.id;
    setActionId(userId);
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success(`${deleteUser.name} fue eliminado.`);
      setDeleteUser(null);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setActionId(null);
    }
  };

  const FILTERS = [
    { key: "all", label: "Todos", count: stats.total },
    { key: "pending", label: "Pendientes", count: stats.pending || 0 },
    { key: "subscribed", label: "Suscritos", count: stats.subscribed || 0 },
    { key: "no_subscribed", label: "No suscritos", count: stats.no_subscribed || 0 },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white" data-testid="admin-page">
      <Navbar />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-600/8 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 pt-28 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-between flex-wrap gap-4"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-purple-400/80 mb-2 flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5" /> Panel de Administración
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Inscritos</h1>
            <p className="mt-2 text-zinc-400">Gestiona y valida los comprobantes de pago.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAddOpen(true)}
              className="gn-btn-primary inline-flex items-center gap-2 text-sm"
              data-testid="admin-add-user-btn"
            >
              <Plus className="h-4 w-4" /> Agregar usuario
            </button>
            <button
              onClick={load}
              className="rounded-full border border-zinc-800 hover:border-purple-500/50 px-5 py-2 text-sm text-zinc-300 hover:text-white transition-colors"
              data-testid="admin-refresh-btn"
            >
              Recargar
            </button>
          </div>
        </motion.div>

        {/* TABS */}
        <div className="flex items-center gap-4 border-b border-zinc-800 mt-8 mb-8">
          <button
            onClick={() => setActiveTab("users")}
            className={`pb-3 px-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === "users" ? "border-purple-500 text-purple-400" : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Suscripciones
          </button>
          <button
            onClick={() => setActiveTab("reservations")}
            className={`pb-3 px-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === "reservations" ? "border-purple-500 text-purple-400" : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Clases & Reservas
          </button>
        </div>

        {activeTab === "users" ? (
          <>
            {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
          <StatCard icon={Users} label="Total" value={stats.total} color="bg-zinc-800/50 text-zinc-300" testId="stat-total" />
          <StatCard icon={Clock} label="Pendientes" value={stats.pending || 0} color="bg-amber-500/15 text-amber-300" testId="stat-pending" />
          <StatCard icon={CheckCircle2} label="Suscritos" value={stats.subscribed || 0} color="bg-purple-500/15 text-purple-300" testId="stat-subscribed" />
          <StatCard icon={AlertCircle} label="No suscritos" value={stats.no_subscribed || 0} color="bg-zinc-500/15 text-zinc-300" testId="stat-no-subscribed" />
        </div>

        {/* Filters + Search */}
        <div className="mt-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-wrap gap-2" data-testid="admin-filters">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-2 rounded-full text-sm border transition-all ${
                  filter === f.key
                    ? "bg-purple-500/15 text-purple-200 border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.2)]"
                    : "bg-zinc-950/40 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200"
                }`}
                data-testid={`filter-${f.key}`}
              >
                {f.label} <span className="text-xs opacity-60 ml-1">({f.count})</span>
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o email..."
              className="bg-zinc-950/60 border border-zinc-800 rounded-full pl-10 pr-4 py-2.5 text-sm w-full sm:w-80 focus:outline-none focus:border-purple-500/50"
              data-testid="admin-search-input"
            />
          </div>
        </div>

        {/* Table */}
        <div className="mt-6 gn-card overflow-hidden" data-testid="admin-table">
          {loading ? (
            <div className="py-20 flex items-center justify-center">
              <Loader2 className="h-6 w-6 text-purple-400 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-zinc-500" data-testid="admin-empty">
              <Users className="h-8 w-8 mx-auto mb-3 opacity-50" />
              No hay inscritos en esta vista.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-widest text-zinc-500 border-b border-zinc-800/80">
                    <th className="pl-4 pr-3 py-3 font-semibold">Usuario</th>
                    <th className="hidden md:table-cell px-3 py-3 font-semibold">Email</th>
                    <th className="px-3 py-3 font-semibold">Estado / Plan</th>
                    <th className="hidden sm:table-cell px-3 py-3 font-semibold">Comprobante</th>
                    <th className="pl-3 pr-4 py-3 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-zinc-900/80 hover:bg-zinc-900/40 transition-colors"
                      data-testid={`user-row-${u.id}`}
                    >
                      <td className="pl-4 pr-3 py-3.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="shrink-0 h-9 w-9 rounded-full bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-sm font-semibold text-purple-200">
                            {u.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium text-zinc-100 truncate max-w-[160px] xl:max-w-[220px]">
                              {u.name}
                            </span>
                            {u.manual && (
                              <span className="text-[10px] uppercase tracking-widest text-purple-400/70">
                                Manual
                              </span>
                            )}
                            <span className="md:hidden text-[11px] text-zinc-500 truncate max-w-[160px]">
                              {u.email || "—"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-3 py-3.5 text-zinc-400">
                        <span className="block truncate max-w-[200px] xl:max-w-[280px]">
                          {u.email || <span className="text-zinc-600">—</span>}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex w-fit items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${STATUS_META[u.status]?.pill}`}
                            data-testid={`row-status-${u.id}`}
                          >
                            {STATUS_META[u.status]?.label}
                          </span>
                          {u.status === "subscribed" && u.plan_months && (
                            <span
                              className="text-[11px] text-zinc-400"
                              data-testid={`row-plan-${u.id}`}
                            >
                              {u.plan_months} {u.plan_months === 1 ? "mes" : "meses"} ·{" "}
                              <span className="text-zinc-500">
                                vence {formatDate(u.plan_expires_at)}
                              </span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-3 py-3.5">
                        {u.has_receipt ? (
                          <button
                            onClick={() => setApprovalUser(u)}
                            className="inline-flex items-center gap-1.5 text-purple-300 hover:text-purple-200 text-xs"
                            data-testid={`view-receipt-${u.id}`}
                          >
                            <Eye className="h-3.5 w-3.5" /> Ver
                          </button>
                        ) : (
                          <span className="text-zinc-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="pl-3 pr-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                          {u.status === "pending" && (
                            <button
                              onClick={() => reject(u.id)}
                              disabled={actionId === u.id}
                              title="Rechazar"
                              className="inline-flex items-center gap-1 rounded-full border border-zinc-800 hover:border-red-500/40 hover:text-red-300 px-2.5 py-1 text-[11px] text-zinc-300 transition-all disabled:opacity-50"
                              data-testid={`reject-btn-${u.id}`}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              <span className="hidden lg:inline">Rechazar</span>
                            </button>
                          )}
                          {u.status !== "subscribed" && (
                            <button
                              onClick={() => setApprovalUser(u)}
                              disabled={actionId === u.id}
                              title="Aprobar"
                              className="gn-btn-primary !px-3 !py-1 !text-[11px] inline-flex items-center gap-1 disabled:opacity-60"
                              data-testid={`approve-btn-${u.id}`}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Aprobar
                            </button>
                          )}
                          {u.status === "subscribed" && (
                            <span className="text-[11px] text-purple-300/80 px-2">
                              Activo
                            </span>
                          )}
                          <button
                            onClick={() => setDeleteUser(u)}
                            disabled={actionId === u.id}
                            title="Eliminar usuario"
                            aria-label={`Eliminar a ${u.name}`}
                            className="inline-flex items-center justify-center h-7 w-7 rounded-full border border-zinc-800 hover:border-red-500/50 hover:bg-red-500/10 text-zinc-500 hover:text-red-300 transition-all disabled:opacity-50"
                            data-testid={`delete-btn-${u.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
          </>
        ) : (
          <AdminReservations />
        )}
      </div>

      {/* Modals */}
      {approvalUser && (
        <ApprovalModal
          user={approvalUser}
          onClose={() => setApprovalUser(null)}
          onApprove={approve}
          onReject={reject}
          actionLoading={actionId === approvalUser.id}
        />
      )}
      {addOpen && (
        <AddUserModal
          onClose={() => setAddOpen(false)}
          onCreated={(u) => {
            setUsers((prev) => [u, ...prev]);
            setAddOpen(false);
          }}
        />
      )}
      {deleteUser && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          onClick={() => actionId !== deleteUser.id && setDeleteUser(null)}
          data-testid="delete-modal"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-11 w-11 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-red-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Eliminar usuario</h3>
                  <p className="text-xs text-zinc-500">Esta acción no se puede deshacer.</p>
                </div>
              </div>
              <p className="text-sm text-zinc-300">
                ¿Seguro que quieres eliminar a{" "}
                <span className="font-semibold text-white">{deleteUser.name}</span>
                {deleteUser.email && (
                  <>
                    {" "}<span className="text-zinc-500">({deleteUser.email})</span>
                  </>
                )}
                ?
              </p>
              <p className="text-xs text-zinc-500 mt-2">
                Se borrarán también su comprobante y estado de suscripción.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-zinc-800 flex justify-end gap-3">
              <button
                onClick={() => setDeleteUser(null)}
                disabled={actionId === deleteUser.id}
                className="rounded-full border border-zinc-800 hover:border-zinc-600 px-5 py-2 text-sm text-zinc-300 disabled:opacity-50"
                data-testid="delete-cancel-btn"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={actionId === deleteUser.id}
                className="inline-flex items-center gap-2 rounded-full bg-red-600 hover:bg-red-500 text-white px-5 py-2 text-sm font-medium shadow-[0_0_25px_rgba(239,68,68,0.35)] hover:shadow-[0_0_35px_rgba(239,68,68,0.6)] transition-all disabled:opacity-60"
                data-testid="delete-confirm-btn"
              >
                {actionId === deleteUser.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Eliminar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
