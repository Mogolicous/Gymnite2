import React, { useState, useEffect } from "react";
import { Sparkles, Loader2, Check, ArrowRight, Trash2, Settings2, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import api from "@/lib/api";

export default function AiTrainingSection() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [muscle, setMuscle] = useState("");
  const [routines, setRoutines] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [completedExercises, setCompletedExercises] = useState({});
  
  // Advanced Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [level, setLevel] = useState("Intermedio");
  const [time, setTime] = useState("Normal (45-60m)");
  const [goal, setGoal] = useState("Hipertrofia");
  const [injuries, setInjuries] = useState("");

  const levels = ["Principiante", "Intermedio", "Avanzado"];
  const times = ["Express (20-30m)", "Normal (45-60m)", "Completo (1.5h+)"];
  const goals = ["Hipertrofia", "Fuerza", "Resistencia", "Pérdida de Peso"];

  useEffect(() => {
    fetchAiRoutines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAiRoutines = async () => {
    try {
      const { data } = await api.get("/routines/me");
      const aiRoutines = data.filter(r => r.name.startsWith("AI: "));
      setRoutines(aiRoutines);
      if (aiRoutines.length > 0 && activeIndex >= aiRoutines.length) {
        setActiveIndex(aiRoutines.length - 1);
      }
    } catch (err) {
      console.error(err);
      toast.error("No se pudieron cargar las rutinas de IA");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!muscle.trim()) return;
    
    setGenerating(true);
    try {
      await api.post("/routines/generate-ai", { 
        muscle,
        level,
        time,
        goal,
        injuries
      });
      toast.success("¡Rutina generada con éxito!");
      setMuscle("");
      await fetchAiRoutines();
      setActiveIndex(routines.length); // Select the new one (it will be at the end of the array)
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Error al generar rutina con IA. Revisa tu API Key.");
    } finally {
      setGenerating(false);
    }
  };

  const toggleExercise = (exerciseId) => {
    setCompletedExercises(prev => ({
      ...prev,
      [exerciseId]: !prev[exerciseId]
    }));
  };

  const deleteRoutine = async (id) => {
    if (!window.confirm("¿Seguro que deseas borrar esta rutina?")) return;
    try {
      await api.delete(`/routines/${id}`);
      toast.success("Rutina eliminada");
      fetchAiRoutines();
    } catch (err) {
      toast.error("Error al eliminar la rutina");
    }
  };

  if (loading) {
    return <div className="gn-card p-8 flex justify-center border-amber-500/20"><Loader2 className="animate-spin text-amber-400" /></div>;
  }

  const activeRoutine = routines[activeIndex];
  const progress = activeRoutine ? Math.round(
    (Object.values(completedExercises).filter(Boolean).length / (activeRoutine?.exercises?.length || 1)) * 100
  ) || 0 : 0;

  return (
    <div className="gn-card p-8 col-span-1 lg:col-span-2 relative overflow-hidden" data-testid="ai-training-section">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -z-10 transform translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-amber-500/20 p-2 rounded-lg">
              <Sparkles className="h-5 w-5 text-amber-400" />
            </div>
            <h3 className="text-xl font-semibold bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent">AI Training PRO</h3>
          </div>
          <p className="text-zinc-400 text-sm mt-2 max-w-md">
            Genera entrenamientos hiper-personalizados como si tuvieras un entrenador élite.
          </p>
        </div>
      </div>

      <div className="mb-8">
        <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
          <input
            type="text"
            value={muscle}
            onChange={(e) => setMuscle(e.target.value)}
            placeholder="Ej: Espalda y Bíceps"
            disabled={generating}
            className="flex-1 bg-black/50 border border-zinc-800 focus:border-amber-500/50 rounded-xl px-4 py-3 text-white transition-all outline-none"
          />
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className={`px-4 py-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
              showSettings ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-black/50 border-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            <Settings2 className="h-5 w-5" />
            <span className="sm:hidden">Ajustes</span>
          </button>
          <button
            type="submit"
            disabled={generating || !muscle.trim()}
            className="bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] whitespace-nowrap"
          >
            {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
            Generar
          </button>
        </form>

        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-black/30 border border-zinc-800/50 rounded-2xl p-5 space-y-6">
                
                {/* Level Selectors */}
                <div>
                  <div className="text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-3">Nivel de Experiencia</div>
                  <div className="flex flex-wrap gap-2">
                    {levels.map(l => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setLevel(l)}
                        className={`px-4 py-1.5 rounded-full text-sm transition-all ${level === l ? "bg-amber-500 text-black font-medium shadow-[0_0_10px_rgba(245,158,11,0.3)]" : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:border-zinc-700"}`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Goal Selectors */}
                <div>
                  <div className="text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-3">Objetivo Principal</div>
                  <div className="flex flex-wrap gap-2">
                    {goals.map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGoal(g)}
                        className={`px-4 py-1.5 rounded-full text-sm transition-all ${goal === g ? "bg-amber-500 text-black font-medium shadow-[0_0_10px_rgba(245,158,11,0.3)]" : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:border-zinc-700"}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Selectors */}
                <div>
                  <div className="text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-3">Tiempo Disponible</div>
                  <div className="flex flex-wrap gap-2">
                    {times.map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTime(t)}
                        className={`px-4 py-1.5 rounded-full text-sm transition-all ${time === t ? "bg-amber-500 text-black font-medium shadow-[0_0_10px_rgba(245,158,11,0.3)]" : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:border-zinc-700"}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Injuries */}
                <div>
                  <div className="text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-3">Lesiones o Limitaciones (Opcional)</div>
                  <input
                    type="text"
                    value={injuries}
                    onChange={(e) => setInjuries(e.target.value)}
                    placeholder="Ej: Dolor en rodilla derecha, molestia en hombro..."
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500/50 rounded-xl px-4 py-2.5 text-sm text-white transition-all outline-none"
                  />
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {routines.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide flex-1 mr-4">
              {routines.map((r, i) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setActiveIndex(i);
                    setCompletedExercises({});
                  }}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    activeIndex === i 
                      ? "bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]" 
                      : "bg-black border border-zinc-800 text-zinc-400 hover:text-amber-400 hover:border-amber-500/50"
                  }`}
                >
                  {r.name.replace("AI: ", "")}
                </button>
              ))}
            </div>
            
            {activeRoutine && (
               <div className="flex flex-col items-end shrink-0">
                 <span className="text-2xl font-bold text-white">{progress}%</span>
                 <div className="w-24 h-1.5 bg-zinc-800 rounded-full mt-1 overflow-hidden">
                   <div 
                     className="h-full bg-amber-500 transition-all duration-500 ease-out" 
                     style={{ width: `${progress}%` }} 
                   />
                 </div>
               </div>
            )}
          </div>

          {activeRoutine && (
            <motion.div
              key={activeRoutine.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-amber-500/80">
                  {activeRoutine.objective}
                </span>
                <button onClick={() => deleteRoutine(activeRoutine.id)} className="text-zinc-600 hover:text-red-400 transition-colors p-1" title="Eliminar Rutina">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {activeRoutine.exercises.map((ex, i) => {
                const isCompleted = completedExercises[ex.id];
                return (
                  <div 
                    key={ex.id}
                    onClick={() => toggleExercise(ex.id)}
                    className={`group cursor-pointer p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-4 ${
                      isCompleted 
                        ? "bg-amber-500/5 border-amber-500/20" 
                        : "bg-black/50 border-zinc-800/50 hover:border-amber-500/30"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center border transition-colors ${
                        isCompleted
                          ? "bg-amber-500 text-black border-amber-500"
                          : "bg-zinc-900 border-zinc-800 text-zinc-500 group-hover:text-amber-400 group-hover:border-amber-500/30"
                      }`}>
                        {isCompleted ? <Check className="h-5 w-5" /> : <span>{i + 1}</span>}
                      </div>
                      <div>
                        <h5 className={`font-medium transition-colors ${isCompleted ? "text-amber-400/80 line-through" : "text-zinc-200"}`}>
                          {ex.name}
                        </h5>
                        <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider font-semibold">
                          {ex.sets === 1 && ex.reps > 4 
                            ? `${ex.reps} MINUTOS` 
                            : `${ex.sets} Series × ${ex.reps} Reps`
                          }
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <div className="text-xs text-zinc-400">Descanso</div>
                      <div className={`text-sm font-bold ${isCompleted ? "text-amber-500/50" : "text-amber-400"}`}>
                        {ex.rest_seconds}
                      </div>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
