import React, { useState, useEffect } from "react";
import { Dumbbell, Loader2, Check, ArrowRight, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export default function RoutineSection() {
  const [loading, setLoading] = useState(true);
  const [routines, setRoutines] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [completedExercises, setCompletedExercises] = useState({});
  const [expandedImages, setExpandedImages] = useState({});

  useEffect(() => {
    fetchRoutines();
  }, []);

  const fetchRoutines = async () => {
    try {
      const { data } = await api.get("/routines/me");
      // Ocultar las rutinas de IA en esta sección normal
      const normalRoutines = data.filter(r => !r.name.startsWith("AI: "));
      setRoutines(normalRoutines);
    } catch (err) {
      console.error(err);
      toast.error("No se pudieron cargar las rutinas");
    } finally {
      setLoading(false);
    }
  };

  const toggleExercise = (exId) => {
    setCompletedExercises(prev => ({ ...prev, [exId]: !prev[exId] }));
  };

  const toggleImage = (e, exId) => {
    e.stopPropagation();
    setExpandedImages(prev => ({ ...prev, [exId]: !prev[exId] }));
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

  // Sort routines by name so they appear in order (Día 1, Día 2, etc.)
  const sortedRoutines = [...routines].sort((a, b) => a.name.localeCompare(b.name));
  const activeRoutine = sortedRoutines[activeIndex] || sortedRoutines[0];
  const progress = Math.round(
    (Object.values(completedExercises).filter(Boolean).length / (activeRoutine?.exercises?.length || 1)) * 100
  ) || 0;

  return (
    <div className="gn-card p-8 col-span-1 lg:col-span-2" data-testid="routine-section">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
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

      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        {sortedRoutines.map((r, i) => (
          <button
            key={r.id}
            onClick={() => {
              setActiveIndex(i);
              setCompletedExercises({}); // Reset completion when changing day
              setExpandedImages({});
            }}
            className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-medium transition-all ${
              activeIndex === i 
                ? "bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]" 
                : "bg-zinc-900/50 text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            {r.name.split(":")[0]} {/* Muestra solo "Día 1", "Día 2", etc. */}
          </button>
        ))}
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
                    {ex.sets === 1 && ex.reps > 4 ? (
                      <div className="flex flex-col">
                        <span className="text-zinc-500 text-[10px] uppercase tracking-widest">Duración</span>
                        <span className="font-semibold text-white">{ex.reps} MIN</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col">
                          <span className="text-zinc-500 text-[10px] uppercase tracking-widest">Series</span>
                          <span className="font-semibold text-white">{ex.sets}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-zinc-500 text-[10px] uppercase tracking-widest">Reps</span>
                          <span className="font-semibold text-white">{ex.reps}</span>
                        </div>
                      </>
                    )}
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
              
              {/* Image Toggle Button */}
              {ex.image_url && (
                <button
                  onClick={(e) => toggleImage(e, ex.id)}
                  className={`absolute top-4 right-16 p-2 rounded-full transition-all ${
                    expandedImages[ex.id] 
                      ? "bg-purple-500 text-white" 
                      : "bg-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                  title="Ver demostración"
                >
                  <ImageIcon className="h-4 w-4" />
                </button>
              )}
              
              {/* Expandable Image Area */}
              {ex.image_url && (
                <div 
                  className={`transition-all duration-500 overflow-hidden ${
                    expandedImages[ex.id] ? "max-h-[500px] mt-4 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="w-full rounded-xl overflow-hidden bg-zinc-950 flex items-center justify-center">
                    <img 
                      src={ex.image_url} 
                      alt={ex.name} 
                      className="w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity"
                      loading="lazy"
                    />
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
