import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, TrendingUp, Users, DollarSign, CalendarDays } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

function StatCard({ icon: Icon, label, value, subtext, color }) {
  return (
    <div className="gn-card p-6 border border-zinc-800 bg-zinc-900/50 flex flex-col gap-4 relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${color} opacity-5 blur-3xl group-hover:opacity-10 transition-opacity rounded-full -mr-10 -mt-10`} />
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">{label}</div>
          <div className="text-3xl font-bold text-zinc-100">{value}</div>
          {subtext && <div className="text-xs text-zinc-400 mt-2">{subtext}</div>}
        </div>
        <div className={`h-12 w-12 rounded-xl flex items-center justify-center bg-zinc-950 border border-zinc-800`}>
          <Icon className="h-6 w-6 text-zinc-300" strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg shadow-xl">
        <p className="text-zinc-400 text-xs mb-1">{label}</p>
        <p className="text-purple-300 font-semibold text-sm">
          {payload[0].value} asistencias
        </p>
      </div>
    );
  }
  return null;
};

export default function AdminReports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      try {
        const res = await api.get("/admin/reports");
        if (active) setData(res.data);
      } catch (err) {
        if (active) toast.error(formatApiError(err));
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchData();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
        <span className="text-sm text-zinc-500">Cargando métricas...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-20 text-center text-zinc-500">
        Error al cargar los reportes.
      </div>
    );
  }

  const revenueData = [
    { name: 'Pesas', value: data.revenue_by_plan.pesas || 0 },
    { name: 'Clases', value: data.revenue_by_plan.clases || 0 },
    { name: 'Premium', value: data.revenue_by_plan.premium || 0 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={DollarSign} 
          label="MRR Estimado" 
          value={`$${data.mrr}`} 
          subtext="Basado en planes activos"
          color="from-emerald-500 to-green-500" 
        />
        <StatCard 
          icon={Users} 
          label="Miembros Activos" 
          value={data.active_users} 
          subtext={`De un total de ${data.total_users} registrados`}
          color="from-purple-500 to-fuchsia-500" 
        />
        <StatCard 
          icon={CalendarDays} 
          label="Próximos a Expirar" 
          value={data.expiring_soon} 
          subtext="Planes vencen en próximos 30 días"
          color="from-amber-500 to-orange-500" 
        />
        <StatCard 
          icon={TrendingUp} 
          label="Tasa de Actividad" 
          value={`${data.total_users > 0 ? Math.round((data.active_users / data.total_users) * 100) : 0}%`} 
          subtext="Usuarios con plan activo"
          color="from-blue-500 to-cyan-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Asistencia Chart */}
        <div className="lg:col-span-2 gn-card p-6 border border-zinc-800 bg-zinc-900/30">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-zinc-100">Tendencia de Asistencia</h3>
            <p className="text-sm text-zinc-400">Visitas registradas en los últimos 30 días</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.attendance_trend}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#52525b" 
                  fontSize={12} 
                  tickFormatter={(val) => {
                    const d = new Date(val + "T00:00:00");
                    return `${d.getDate()}/${d.getMonth()+1}`;
                  }}
                />
                <YAxis stroke="#52525b" fontSize={12} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#a855f7" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorCount)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribución de Ingresos */}
        <div className="gn-card p-6 border border-zinc-800 bg-zinc-900/30">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-zinc-100">Ingresos por Plan</h3>
            <p className="text-sm text-zinc-400">Distribución mensual estimada (MRR)</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#52525b" fontSize={12} />
                <YAxis stroke="#52525b" fontSize={12} />
                <Tooltip 
                  cursor={{fill: '#27272a', opacity: 0.4}}
                  contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#d8b4fe', fontWeight: 600 }}
                  formatter={(value) => [`$${value}`, 'MRR']}
                />
                <Bar dataKey="value" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
