import React, { useState, useEffect } from "react";
import { Loader2, CalendarDays, Users, Search, BarChart2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { toast } from "sonner";
import api from "@/lib/api";

const SHIFTS = {
  morning: { label: "Turno Mañana", time: "09:00 AM - 11:00 AM" },
  evening: { label: "Turno Tarde", time: "17:00 PM - 20:00 PM" },
  saturday: { label: "Único Turno", time: "09:00 AM - 11:00 PM" }
};

export default function AdminReservations() {
  const [loading, setLoading] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [stats, setStats] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);

  const fetchReservations = React.useCallback(async () => {
    setLoading(true);
    const dateStr = selectedDate.toISOString().split("T")[0];
    try {
      const { data } = await api.get(`/classes/admin/reservations?date=${dateStr}`);
      setReservations(data);
    } catch (err) {
      console.error(err);
      toast.error("Error al cargar reservas");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  const fetchStats = React.useCallback(async () => {
    setLoadingStats(true);
    try {
      const { data } = await api.get('/admin/attendance-stats');
      setStats(data);
    } catch (err) {
      console.error(err);
      toast.error("Error al cargar estadísticas de asistencia");
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    fetchReservations();
    fetchStats();
  }, [fetchReservations, fetchStats]);

  const grouped = reservations.reduce((acc, r) => {
    if (!acc[r.shift]) acc[r.shift] = [];
    acc[r.shift].push(r);
    return acc;
  }, {});

  const dayOfWeek = selectedDate.getDay();
  const isClosed = dayOfWeek === 0;

  return (
    <div className="mt-8 space-y-8" data-testid="admin-reservations">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Reservas de Clases</h2>
          <p className="text-zinc-400 text-sm mt-1">Control de asistencia por turnos</p>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide w-full sm:w-auto">
          {Array.from({ length: 7 }).map((_, i) => {
            const d = new Date();
            // Show from 2 days ago to 4 days in future
            d.setDate(d.getDate() - 2 + i);
            const isSelected = d.toDateString() === selectedDate.toDateString();
            
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(d)}
                className={`flex flex-col items-center min-w-[65px] py-1.5 rounded-lg border transition-all ${
                  isSelected
                    ? "bg-purple-500/15 border-purple-500/50 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                    : "bg-zinc-900/40 border-zinc-800/50 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                }`}
              >
                <span className="text-[9px] uppercase tracking-widest font-semibold mb-0.5">
                  {d.toLocaleDateString("es-ES", { weekday: "short" })}
                </span>
                <span className={`text-base font-bold ${isSelected ? "text-purple-100" : "text-zinc-300"}`}>
                  {d.getDate()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="animate-spin text-purple-400 h-8 w-8" />
        </div>
      ) : isClosed ? (
        <div className="gn-card py-20 text-center text-zinc-500">
          <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p>Cerrado los Domingos</p>
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="gn-card py-20 text-center text-zinc-500">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p>No hay reservas para este día.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(grouped).map(([shift, resList]) => (
            <div key={shift} className="gn-card p-6 border-t-4 border-t-purple-500/50">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">{SHIFTS[shift]?.label || shift}</h3>
                  <p className="text-sm text-zinc-400">{SHIFTS[shift]?.time}</p>
                </div>
                <div className="bg-purple-500/10 text-purple-300 px-3 py-1 rounded-full text-xs font-semibold border border-purple-500/20">
                  {resList.length} inscritos
                </div>
              </div>

              <div className="space-y-3">
                {resList.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50">
                    <div className="h-8 w-8 rounded-full bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-xs font-bold text-purple-300">
                      {r.user_name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-zinc-100">{r.user_name}</div>
                      <div className="text-[10px] text-zinc-500">{r.user_email || "Sin email"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Attendance Stats Chart */}
      <div className="gn-card p-6 mt-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <BarChart2 className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Horarios Más Concurridos</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Basado en todo el historial de tarjetas RFID</p>
          </div>
        </div>

        {loadingStats ? (
          <div className="h-[300px] flex items-center justify-center">
            <Loader2 className="animate-spin text-purple-400 h-8 w-8" />
          </div>
        ) : stats.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-zinc-500 text-sm">
            No hay datos suficientes para mostrar estadísticas.
          </div>
        ) : (
          <div className="h-[350px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  stroke="#71717a" 
                  fontSize={12} 
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#71717a" 
                  fontSize={12} 
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip 
                  cursor={{ fill: '#27272a', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px' }}
                  itemStyle={{ color: '#c084fc', fontWeight: 'bold' }}
                  formatter={(value) => [`${value} ingresos`, 'Tráfico']}
                  labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
                />
                <Bar 
                  dataKey="count" 
                  fill="#9333ea" 
                  radius={[4, 4, 0, 0]}
                  barSize={32}
                  activeBar={{ fill: '#a855f7' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
