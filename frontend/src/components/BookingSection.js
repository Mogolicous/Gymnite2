import React, { useState, useEffect } from "react";
import { CalendarDays, Loader2, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const SHIFTS = {
  morning: { label: "Turno Mañana", time: "09:00 AM - 11:00 AM" },
  evening: { label: "Turno Tarde", time: "17:00 PM - 20:00 PM" },
  saturday: { label: "Único Turno", time: "09:00 AM - 11:00 PM" } // Same as flyer
};

export default function BookingSection() {
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState([]);
  const [booking, setBooking] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      const { data } = await api.get("/classes/my-reservations");
      setReservations(data);
    } catch (err) {
      console.error(err);
      toast.error("Error al cargar reservas");
    } finally {
      setLoading(false);
    }
  };

  const getLocalDateStr = (d) => {
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().split("T")[0];
  };

  const handleReserve = async (shift) => {
    setBooking(true);
    const dateStr = getLocalDateStr(selectedDate);
    try {
      const { data } = await api.post("/classes/reserve", {
        date: dateStr,
        shift: shift
      });
      setReservations([data, ...reservations]);
      toast.success("¡Turno reservado exitosamente!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error al reservar");
    } finally {
      setBooking(false);
    }
  };

  const dateStr = getLocalDateStr(selectedDate);
  const todayStr = getLocalDateStr(new Date());
  const isToday = dateStr === todayStr;
  const currentHour = new Date().getHours();
  
  const dayOfWeek = selectedDate.getDay(); // 0 is Sunday, 6 is Saturday
  
  // Sundays are closed
  const isClosed = dayOfWeek === 0;
  const isSaturday = dayOfWeek === 6;

  // Determine available shifts
  let availableShifts = [];
  if (!isClosed) {
    if (isSaturday) {
      availableShifts = ["saturday"];
    } else {
      availableShifts = ["morning", "evening"];
    }
  }

  // Check if user already booked this day
  const todaysReservations = reservations.filter(r => r.date === dateStr);

  return (
    <div className="gn-card p-8 col-span-1 lg:col-span-2 mt-8" data-testid="booking-section">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <CalendarDays className="h-5 w-5 text-purple-400" />
            <h3 className="text-xl font-semibold">Reserva de Clases</h3>
          </div>
          <p className="text-zinc-400 text-sm mt-1">
            Box · Kickboxing · Muay Thai
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {/* Render next 7 days */}
        {Array.from({ length: 7 }).map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() + i);
          const isSelected = d.toDateString() === selectedDate.toDateString();
          
          return (
            <button
              key={i}
              onClick={() => setSelectedDate(d)}
              className={`flex flex-col items-center min-w-[70px] py-2 rounded-xl border transition-all ${
                isSelected
                  ? "bg-purple-500/10 border-purple-500/50 text-purple-300"
                  : "bg-zinc-900/40 border-zinc-800/50 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
              }`}
            >
              <span className="text-[10px] uppercase tracking-widest font-semibold mb-1">
                {d.toLocaleDateString("es-ES", { weekday: "short" })}
              </span>
              <span className={`text-lg font-bold ${isSelected ? "text-purple-100" : "text-zinc-300"}`}>
                {d.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-purple-400 h-6 w-6" /></div>
      ) : isClosed ? (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 text-center text-zinc-500">
          <Clock className="h-6 w-6 mx-auto mb-2 opacity-50" />
          <p>Cerrado los Domingos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableShifts.map((shiftKey) => {
            const isBooked = todaysReservations.some(r => r.shift === shiftKey);
            const shiftInfo = SHIFTS[shiftKey];
            
            let isPast = false;
            if (isToday) {
              if (shiftKey === "morning" && currentHour >= 11) isPast = true;
              if (shiftKey === "evening" && currentHour >= 20) isPast = true;
              if (shiftKey === "saturday" && currentHour >= 23) isPast = true;
            }

            return (
              <div 
                key={shiftKey} 
                className={`relative overflow-hidden rounded-2xl p-5 border transition-all duration-300 ${
                  isBooked
                    ? "bg-purple-500/10 border-purple-500/30"
                    : isPast 
                      ? "bg-zinc-900/20 border-zinc-900/50 opacity-50"
                      : "bg-zinc-900/40 border-zinc-800/50"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h5 className={`font-bold ${isBooked ? "text-purple-300" : isPast ? "text-zinc-600" : "text-zinc-100"}`}>
                      {shiftInfo.label}
                    </h5>
                    <p className={`text-sm flex items-center gap-2 mt-1 ${isPast ? "text-zinc-600" : "text-zinc-400"}`}>
                      <Clock className="h-3 w-3" /> {shiftInfo.time}
                    </p>
                  </div>
                  {isBooked && (
                    <div className="h-8 w-8 rounded-full bg-purple-500 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>

                {!isBooked ? (
                  <button
                    onClick={() => handleReserve(shiftKey)}
                    disabled={booking || isPast}
                    className={`w-full py-2.5 rounded-xl text-sm font-medium border flex justify-center items-center gap-2 transition-colors ${
                      isPast 
                        ? "bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed" 
                        : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                    }`}
                  >
                    {booking && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isPast ? "Turno Finalizado" : "Reservar Turno"}
                  </button>
                ) : (
                  <div className="w-full py-2.5 rounded-xl text-sm font-medium border border-purple-500/20 bg-purple-500/10 text-purple-300 text-center">
                    Turno Reservado
                  </div>
                )}
              </div>
          })}
        </div>
      )}
    </div>
  );
}
