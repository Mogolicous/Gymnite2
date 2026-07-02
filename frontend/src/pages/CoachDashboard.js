import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import AdminReservations from "./AdminReservations";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import { Dumbbell, Users, Loader2, Plus, UserPlus, Search } from "lucide-react";

function RoutineBuilder({ isGeneral, selectedUser, onCreated }) {
  const [loading, setLoading] = useState(false);
  const [routineData, setRoutineData] = useState({ name: "", objective: "" });
  const [exercises, setExercises] = useState([{ name: "", sets: 4, reps: 10, rest_seconds: "60s" }]);

  const addExercise = () => {
    setExercises([...exercises, { name: "", sets: 4, reps: 10, rest_seconds: "60s" }]);
  };

  const updateEx = (index, field, value) => {
    const newEx = [...exercises];
    newEx[index][field] = value;
    setExercises(newEx);
  };

  const handleSave = async () => {
    if (!routineData.name) return toast.error("El nombre de la rutina es obligatorio");
    if (exercises.some(e => !e.name)) return toast.error("Todos los ejercicios deben tener nombre");
    
    setLoading(true);
    try {
      const payload = {
        name: routineData.name,
        objective: routineData.objective,
        user_id: isGeneral ? null : selectedUser?.id
      };
      const { data: routine } = await api.post("/routines", payload);

      for (const ex of exercises) {
        await api.post(`/routines/${routine.id}/exercises`, ex);
      }
      
      toast.success("Rutina creada exitosamente");
      setRoutineData({ name: "", objective: "" });
      setExercises([{ name: "", sets: 4, reps: 10, rest_seconds: "60s" }]);
      if (onCreated) onCreated();
    } catch (err) {
      toast.error(formatApiError(err) || "Error al crear rutina");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gn-card p-6 border border-zinc-800/50">
      <h3 className="text-xl font-bold mb-4">{isGeneral ? "Crear Rutina General (Aleatoria)" : `Asignar a: ${selectedUser?.name}`}</h3>
      
      <div className="space-y-4 mb-8">
        <div>
          <label className="block text-sm text-zinc-400 mb-1">Nombre de la Rutina</label>
          <input
            className="gn-input w-full"
            placeholder="Ej: Día 1 - Pecho y Tríceps"
            value={routineData.name}
            onChange={e => setRoutineData({ ...routineData, name: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-400 mb-1">Objetivo (Opcional)</label>
          <input
            className="gn-input w-full"
            placeholder="Ej: Hipertrofia"
            value={routineData.objective}
            onChange={e => setRoutineData({ ...routineData, objective: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-zinc-300">Ejercicios</h4>
          <button onClick={addExercise} className="gn-button-secondary text-xs px-3 py-1">
            <Plus className="w-3 h-3 mr-1" /> Añadir Ejercicio
          </button>
        </div>
        
        {exercises.map((ex, i) => (
          <div key={i} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/50">
            <input
              placeholder="Nombre del Ejercicio"
              className="gn-input flex-1 min-w-[200px]"
              value={ex.name}
              onChange={e => updateEx(i, "name", e.target.value)}
            />
            <div className="flex gap-2 w-full sm:w-auto">
              <input type="number" placeholder="Sets" className="gn-input w-20" value={ex.sets} onChange={e => updateEx(i, "sets", parseInt(e.target.value) || 0)} />
              <input type="number" placeholder="Reps" className="gn-input w-20" value={ex.reps} onChange={e => updateEx(i, "reps", parseInt(e.target.value) || 0)} />
              <input placeholder="Descanso" className="gn-input w-24" value={ex.rest_seconds} onChange={e => updateEx(i, "rest_seconds", e.target.value)} />
            </div>
          </div>
        ))}
      </div>

      <button onClick={handleSave} disabled={loading} className="gn-button mt-8 w-full">
        {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Guardar Rutina"}
      </button>
    </div>
  );
}

export default function CoachDashboard() {
  const [activeTab, setActiveTab] = useState("attendance");
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  
  const [generalRoutines, setGeneralRoutines] = useState([]);

  useEffect(() => {
    if (activeTab === "premium") {
      fetchPremiumUsers();
    } else if (activeTab === "general") {
      fetchGeneralRoutines();
    }
  }, [activeTab]);

  const fetchGeneralRoutines = async () => {
    try {
      const { data } = await api.get("/routines/general");
      setGeneralRoutines(data);
    } catch (err) {
      toast.error("Error al cargar rutinas generales");
    }
  };

  const deleteGeneralRoutine = async (id) => {
    try {
      await api.delete(`/routines/${id}`);
      toast.success("Rutina eliminada");
      fetchGeneralRoutines();
    } catch (err) {
      toast.error("Error al eliminar");
    }
  };

  const setGeneralRoutineActive = async (id) => {
    try {
      await api.post(`/routines/general/${id}/set-active`);
      toast.success("Rutina establecida para hoy");
      fetchGeneralRoutines();
    } catch (err) {
      toast.error("Error al establecer rutina");
    }
  };

  const fetchPremiumUsers = async () => {
    setUsersLoading(true);
    try {
      const { data } = await api.get("/admin/users");
      // Filtramos solo los que son tier premium y están suscritos
      const premium = data.filter(u => u.plan_type === "premium" && u.status === "subscribed");
      setUsers(premium);
    } catch (err) {
      toast.error("Error al cargar alumnos premium");
    } finally {
      setUsersLoading(false);
    }
  };

  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 pb-20">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 pt-24">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl font-black mb-2 tracking-tight">
              Panel <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">Coach</span>
            </motion.h1>
            <p className="text-zinc-400">Gestiona la asistencia y rutinas del gimnasio.</p>
          </div>
        </div>

        <div className="flex overflow-x-auto gap-2 pb-2 mb-8 border-b border-zinc-800/50">
          <button onClick={() => setActiveTab("attendance")} className={`px-4 py-2 rounded-t-lg font-semibold transition-colors ${activeTab === "attendance" ? "bg-purple-500/10 text-purple-300 border-b-2 border-purple-500" : "text-zinc-500 hover:text-zinc-300"}`}>
            <div className="flex items-center gap-2"><Users className="w-4 h-4" /> Asistencias</div>
          </button>
          <button onClick={() => setActiveTab("general")} className={`px-4 py-2 rounded-t-lg font-semibold transition-colors ${activeTab === "general" ? "bg-purple-500/10 text-purple-300 border-b-2 border-purple-500" : "text-zinc-500 hover:text-zinc-300"}`}>
            <div className="flex items-center gap-2"><Dumbbell className="w-4 h-4" /> Rutinas Generales</div>
          </button>
          <button onClick={() => setActiveTab("premium")} className={`px-4 py-2 rounded-t-lg font-semibold transition-colors ${activeTab === "premium" ? "bg-purple-500/10 text-purple-300 border-b-2 border-purple-500" : "text-zinc-500 hover:text-zinc-300"}`}>
            <div className="flex items-center gap-2"><UserPlus className="w-4 h-4" /> Rutinas Premium</div>
          </button>
        </div>

        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          {activeTab === "attendance" && (
            <AdminReservations />
          )}

          {activeTab === "general" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <p className="text-zinc-400 mb-6">
                  Crea una nueva rutina general. Si no estableces ninguna para hoy, se asignará una al azar a los alumnos estándar.
                </p>
                <RoutineBuilder isGeneral={true} onCreated={fetchGeneralRoutines} />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-4">Rutinas Generales Existentes</h3>
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {generalRoutines.length === 0 ? (
                    <p className="text-zinc-500">No hay rutinas generales creadas.</p>
                  ) : (
                    generalRoutines.map(r => {
                      const isActive = r.objective?.includes("[ACTIVE:");
                      const cleanObjective = r.objective ? r.objective.replace(/\[ACTIVE:\d{4}-\d{2}-\d{2}\]\s*/, "") : "";
                      return (
                        <div key={r.id} className={`gn-card p-4 flex flex-col gap-3 border ${isActive ? "border-amber-500 bg-amber-500/5" : "border-zinc-800/50"}`}>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-lg">{r.name}</h4>
                              {isActive && <span className="bg-amber-500 text-black text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider">Activa Hoy</span>}
                            </div>
                            <p className="text-sm text-zinc-400">{cleanObjective}</p>
                            <p className="text-xs text-zinc-500 mt-1">{r.exercises?.length || 0} Ejercicios</p>
                          </div>
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => setGeneralRoutineActive(r.id)} disabled={isActive} className="text-xs flex-1 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-50 transition-colors font-semibold">
                              {isActive ? "Ya está activa" : "⭐ Asignar Hoy"}
                            </button>
                            <button onClick={() => deleteGeneralRoutine(r.id)} className="text-xs px-4 py-2 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors font-semibold">
                              Eliminar
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "premium" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="col-span-1">
                <div className="gn-input-container mb-4">
                  <Search className="w-4 h-4 text-zinc-500" />
                  <input className="gn-input border-0 pl-10" placeholder="Buscar premium..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {usersLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-purple-500 mx-auto mt-10" />
                  ) : filteredUsers.length === 0 ? (
                    <p className="text-zinc-500 text-sm text-center mt-10">No hay alumnos premium</p>
                  ) : (
                    filteredUsers.map(u => (
                      <button
                        key={u.id}
                        onClick={() => setSelectedUser(u)}
                        className={`w-full text-left p-4 rounded-xl border transition-all ${
                          selectedUser?.id === u.id
                            ? "bg-purple-500/10 border-purple-500/50 text-white"
                            : "bg-zinc-900/40 border-zinc-800/50 text-zinc-400 hover:bg-zinc-800/50"
                        }`}
                      >
                        <div className="font-semibold">{u.name}</div>
                        <div className="text-xs opacity-60 mt-1">Tier Premium</div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="col-span-1 md:col-span-2">
                {selectedUser ? (
                  <RoutineBuilder 
                    isGeneral={false} 
                    selectedUser={selectedUser} 
                    onCreated={() => setSelectedUser(null)} 
                  />
                ) : (
                  <div className="gn-card p-12 text-center text-zinc-500 border-dashed border-2 border-zinc-800/50">
                    <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>Selecciona un alumno premium para asignarle una rutina personalizada.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
