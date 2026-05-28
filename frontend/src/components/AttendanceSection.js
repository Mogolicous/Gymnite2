import React, { useState, useEffect } from "react";
import { Calendar, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export default function AttendanceSection() {
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [history, setHistory] = useState([]);
  
  const today = new Date();
  const todayString = today.toISOString().split("T")[0]; // YYYY-MM-DD
  const hasCheckedInToday = history.some((h) => h.date === todayString);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const { data } = await api.get("/attendance/me");
      setHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      const { data } = await api.post("/attendance");
      setHistory([data, ...history]);
      toast.success("¡Asistencia registrada con éxito!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error al registrar asistencia");
    } finally {
      setCheckingIn(false);
    }
  };

  // Generate simple current month calendar days
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const attended = history.some((h) => h.date === dateStr);
    const isToday = dateStr === todayString;
    return { day, dateStr, attended, isToday };
  });

  if (loading) {
    return <div className="gn-card p-8 flex justify-center"><Loader2 className="animate-spin text-purple-400" /></div>;
  }

  return (
    <div className="gn-card p-8" data-testid="attendance-section">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-purple-400" />
          <h3 className="text-xl font-semibold">Mi Asistencia</h3>
        </div>
        <button
          onClick={handleCheckIn}
          disabled={checkingIn || hasCheckedInToday}
          className="gn-btn-primary flex items-center gap-2 disabled:opacity-50 text-sm py-2 px-4"
        >
          {checkingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {hasCheckedInToday ? "Asistencia Confirmada" : "Confirmar Asistencia Hoy"}
        </button>
      </div>

      <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
        <div className="text-sm font-medium text-zinc-400 mb-4 capitalize">
          {today.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
        </div>
        <div className="grid grid-cols-7 gap-2 sm:gap-3">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
            <div key={d} className="text-center text-xs text-zinc-500 font-medium pb-2">{d}</div>
          ))}
          
          {/* Empty cells for first day offset */}
          {Array.from({ length: new Date(year, month, 1).getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {days.map((d) => (
            <div
              key={d.day}
              className={`aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                d.attended
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  : d.isToday
                  ? "bg-zinc-800 text-white border border-zinc-600"
                  : "bg-zinc-900/40 text-zinc-500 hover:bg-zinc-800"
              }`}
            >
              {d.day}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
