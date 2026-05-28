import React, { useState, useEffect } from "react";
import { Dumbbell, Loader2, Check, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export default function RoutineSection() {
  const [loading, setLoading] = useState(true);
  const [routines, setRoutines] = useState([]);
  const [completedExercises, setCompletedExercises] = useState({});

  useEffect(() => {
    fetchRoutines();
  }, []);

  const fetchRoutines = async () => {
    try {
      const { data } = await api.get("/routines/me");
      setRoutines(data);
    } catch (err) {
      console.error(err);
      toast.error("No se pudieron cargar las rutinas");
    } finally {
      setLoading(false);
    }
  };

  const toggleExercise = (exerciseId) => {
    setCompletedExercises(prev => ({
      ...prev,
      [exerciseId]: !prev[exerciseId]
    }));
  };

  if (loading) {
    return <div className="gn-card p-8 flex justify-center"><Loader2 className="animate-spin text-purple-400" /></div>;
  }

  if (routines.length === 0) {
    return (
      <div className="gn-card p-8 text-center text-zinc-500">
        <Dumbbell className="h-8 w-8 mx-auto mb-3 opacity-20" />
        <p>Aún no tienes rutinas asignadas.</p>
        <p className="text-sm">Un entrenador creará tu plan pronto.</p>
      </div>
    );
  }

  // For this version, we just show the first routine (the active one)
  const activeRoutine = routines[0];
  const progress = Math.round(
    (Object.values(completedExercises).filter(Boolean).length / activeRoutine.exercises.length) * 100
  ) || 0;

  return (
    <div className="gn-card p-8 col-span-1 lg:col-span-2" data-testid="routine-section">
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Dumbbell className="h-5 w-5 text-purple-400" />
            <h3 className="text-xl font-semibold">Tu Entrenamiento</h3>
          </div>
          <h4 className="text-2xl font-bold text-white mt-3">{activeRoutine.name}</h4>
          {activeRoutine.objective && (
            <p className="text-purple-300/80 text-sm mt-1 uppercase tracking-widest">{activeRoutine.objective}</p>
          )}
        </div>
        
        <div className="flex flex-col items-end">
          <span className="text-3xl font-bold text-white">{progress}%</span>
          <span className="text-xs uppercase tracking-widest text-zinc-500">Completado Hoy</span>
          <div className="w-32 h-2 bg-zinc-800 rounded-full mt-2 overflow-hidden">
            <div 
              className="h-full bg-purple-500 transition-all duration-500 ease-out" 
              style={{ width: `${progress}%` }} 
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeRoutine.exercises.map((ex, index) => {
          const isDone = completedExercises[ex.id];
          return (
            <button
              key={ex.id}
              onClick={() => toggleExercise(ex.id)}
              className={`text-left relative overflow-hidden rounded-2xl p-5 border transition-all duration-300 ${
                isDone 
                  ? "bg-purple-500/10 border-purple-500/30" 
                  : "bg-zinc-900/40 border-zinc-800/50 hover:border-zinc-700 hover:bg-zinc-800/40"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold text-zinc-500 mb-1">EJERCICIO {index + 1}</div>
                  <h5 className={`text-lg font-bold mb-3 ${isDone ? "text-purple-100" : "text-zinc-100"}`}>
                    {ex.name}
                  </h5>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex flex-col">
                      <span className="text-zinc-500 text-[10px] uppercase tracking-widest">Series</span>
                      <span className="font-semibold text-white">{ex.sets}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-zinc-500 text-[10px] uppercase tracking-widest">Reps</span>
                      <span className="font-semibold text-white">{ex.reps}</span>
                    </div>
                    {ex.rest_seconds && (
                      <div className="flex flex-col">
                        <span className="text-zinc-500 text-[10px] uppercase tracking-widest">Descanso</span>
                        <span className="font-semibold text-white">{ex.rest_seconds}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center transition-all ${
                  isDone ? "bg-purple-500 text-white" : "bg-zinc-800 text-zinc-600"
                }`}>
                  {isDone ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
