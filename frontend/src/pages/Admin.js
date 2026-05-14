import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import api, { formatApiError } from "@/lib/api";
import { CheckCircle2, Clock, Eye, Loader2, Search, Users, XCircle, AlertCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const STATUS_META = {
  no_subscribed: { label: "No Suscrito", pill: "bg-zinc-500/10 text-zinc-300 border-zinc-500/30" },
  pending: { label: "Pendiente", pill: "bg-amber-500/10 text-amber-300 border-amber-500/30" },
  subscribed: { label: "Suscrito", pill: "bg-purple-500/10 text-purple-300 border-purple-500/30" },
};

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

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null); // { user, image, loading }
  const [actionId, setActionId] = useState(null);

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
      const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }, [users, filter, search]);

  const openReceipt = async (u) => {
    if (!u.has_receipt) {
      toast.error("Este usuario aún no subió comprobante.");
      return;
    }
    setModal({ user: u, image: null, loading: true });
    try {
      const { data } = await api.get(`/admin/users/${u.id}/receipt`);
      setModal({ user: u, image: data.image, loading: false });
    } catch (err) {
      toast.error(formatApiError(err));
      setModal(null);
    }
  };

  const approve = async (userId) => {
    setActionId(userId);
    try {
      const { data } = await api.post(`/admin/users/${userId}/approve`);
      setUsers((prev) => prev.map((u) => (u.id === userId ? data : u)));
      toast.success(`${data.name} fue aprobado como Suscrito.`);
      if (modal?.user?.id === userId) setModal(null);
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
      toast.success(`Comprobante rechazado.`);
      if (modal?.user?.id === userId) setModal(null);
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
          <button
            onClick={load}
            className="rounded-full border border-zinc-800 hover:border-purple-500/50 px-5 py-2 text-sm text-zinc-300 hover:text-white transition-colors"
            data-testid="admin-refresh-btn"
          >
            Recargar
          </button>
        </motion.div>

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
                  <tr className="text-left text-xs uppercase tracking-widest text-zinc-500 border-b border-zinc-800/80">
                    <th className="px-6 py-4 font-semibold">Usuario</th>
                    <th className="px-6 py-4 font-semibold">Email</th>
                    <th className="px-6 py-4 font-semibold">Estado</th>
                    <th className="px-6 py-4 font-semibold">Comprobante</th>
                    <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-zinc-900/80 hover:bg-zinc-900/40 transition-colors"
                      data-testid={`user-row-${u.id}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-sm font-semibold text-purple-200">
                            {u.name?.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-zinc-100">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-zinc-400">{u.email}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${STATUS_META[u.status]?.pill}`}
                          data-testid={`row-status-${u.id}`}
                        >
                          {STATUS_META[u.status]?.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {u.has_receipt ? (
                          <button
                            onClick={() => openReceipt(u)}
                            className="inline-flex items-center gap-1.5 text-purple-300 hover:text-purple-200 text-sm"
                            data-testid={`view-receipt-${u.id}`}
                          >
                            <Eye className="h-4 w-4" /> Ver
                          </button>
                        ) : (
                          <span className="text-zinc-600 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          {u.status === "pending" && (
                            <button
                              onClick={() => reject(u.id)}
                              disabled={actionId === u.id}
                              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 hover:border-red-500/40 hover:text-red-300 px-4 py-1.5 text-xs text-zinc-300 transition-all disabled:opacity-50"
                              data-testid={`reject-btn-${u.id}`}
                            >
                              <XCircle className="h-3.5 w-3.5" /> Rechazar
                            </button>
                          )}
                          {u.status !== "subscribed" && (
                            <button
                              onClick={() => approve(u.id)}
                              disabled={actionId === u.id}
                              className="gn-btn-primary !px-5 !py-1.5 !text-xs inline-flex items-center gap-1.5 disabled:opacity-60"
                              data-testid={`approve-btn-${u.id}`}
                            >
                              {actionId === u.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              )}
                              Aprobar
                            </button>
                          )}
                          {u.status === "subscribed" && (
                            <span className="text-xs text-purple-300/80">Activo</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Receipt modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
          onClick={() => setModal(null)}
          data-testid="receipt-modal"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-3xl w-full overflow-hidden shadow-[0_0_40px_rgba(168,85,247,0.18)]"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <div>
                <div className="text-xs uppercase tracking-widest text-zinc-500">Comprobante de</div>
                <div className="font-semibold">{modal.user.name}</div>
                <div className="text-xs text-zinc-500">{modal.user.email}</div>
              </div>
              <button
                onClick={() => setModal(null)}
                className="text-zinc-400 hover:text-white transition-colors"
                data-testid="modal-close-btn"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 bg-black flex items-center justify-center min-h-[300px] max-h-[70vh]">
              {modal.loading ? (
                <Loader2 className="h-6 w-6 text-purple-400 animate-spin" />
              ) : (
                <img
                  src={modal.image}
                  alt="Comprobante"
                  className="max-h-[60vh] max-w-full object-contain rounded-lg"
                  data-testid="receipt-modal-image"
                />
              )}
            </div>
            <div className="px-6 py-4 border-t border-zinc-800 flex justify-end gap-3">
              {modal.user.status === "pending" && (
                <button
                  onClick={() => reject(modal.user.id)}
                  disabled={actionId === modal.user.id}
                  className="rounded-full border border-zinc-800 hover:border-red-500/40 hover:text-red-300 px-5 py-2 text-sm text-zinc-300 transition-all disabled:opacity-50"
                  data-testid="modal-reject-btn"
                >
                  Rechazar
                </button>
              )}
              {modal.user.status !== "subscribed" && (
                <button
                  onClick={() => approve(modal.user.id)}
                  disabled={actionId === modal.user.id}
                  className="gn-btn-primary inline-flex items-center gap-2 disabled:opacity-60"
                  data-testid="modal-approve-btn"
                >
                  {actionId === modal.user.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Aprobar
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
