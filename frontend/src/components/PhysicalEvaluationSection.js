import React, { useState, useEffect } from "react";
import { Activity, Plus, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export default function PhysicalEvaluationSection() {
  const [loading, setLoading] = useState(true);
  const [evaluations, setEvaluations] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [muscle, setMuscle] = useState("");

  useEffect(() => {
    fetchEvaluations();
  }, []);

  const fetchEvaluations = async () => {
    try {
      const { data } = await api.get("/evaluations/me");
      setEvaluations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        date: new Date().toISOString().split("T")[0],
        weight_kg: weight ? parseFloat(weight) : null,
        body_fat_pct: bodyFat ? parseFloat(bodyFat) : null,
        muscle_mass_kg: muscle ? parseFloat(muscle) : null,
      };
      const { data } = await api.post("/evaluations", payload);
      setEvaluations([...evaluations, data]);
      setIsAdding(false);
      setWeight("");
      setBodyFat("");
      setMuscle("");
      toast.success("Evaluación guardada exitosamente");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error al guardar la evaluación");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="gn-card p-8 flex justify-center"><Loader2 className="animate-spin text-purple-400" /></div>;
  }

  return (
    <div className="gn-card p-8" data-testid="evaluations-section">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-purple-400" />
          <h3 className="text-xl font-semibold">Progreso Físico</h3>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            <Plus className="h-4 w-4" /> Agregar Registro
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="mb-8 p-5 bg-zinc-900/50 rounded-xl border border-purple-500/30">
          <h4 className="text-sm font-semibold mb-4 text-zinc-300">Nuevo Registro ({new Date().toLocaleDateString()})</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">Peso (kg)</label>
              <input 
                type="number" step="0.1" 
                value={weight} onChange={(e) => setWeight(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:border-purple-500 outline-none" 
                placeholder="Ej. 75.5" required
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">% Grasa</label>
              <input 
                type="number" step="0.1" 
                value={bodyFat} onChange={(e) => setBodyFat(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:border-purple-500 outline-none" 
                placeholder="Ej. 15.2"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">Músculo (kg)</label>
              <input 
                type="number" step="0.1" 
                value={muscle} onChange={(e) => setMuscle(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:border-purple-500 outline-none" 
                placeholder="Ej. 35.0"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button 
              type="button" 
              onClick={() => setIsAdding(false)} 
              className="text-sm text-zinc-400 hover:text-white px-4 py-2"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={submitting}
              className="gn-btn-primary flex items-center gap-2 text-sm px-6 py-2"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar
            </button>
          </div>
        </form>
      )}

      {evaluations.length === 0 ? (
        <div className="text-center py-8 text-zinc-500 text-sm">
          Aún no tienes registros físicos. Agrega uno para ver tu progreso.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="pb-3 font-medium">Fecha</th>
                <th className="pb-3 font-medium">Peso (kg)</th>
                <th className="pb-3 font-medium">% Grasa</th>
                <th className="pb-3 font-medium">Masa Muscular (kg)</th>
              </tr>
            </thead>
            <tbody>
              {evaluations.slice().reverse().map((ev) => (
                <tr key={ev.id} className="border-b border-zinc-800/50 last:border-0 text-zinc-300">
                  <td className="py-4">{new Date(ev.date).toLocaleDateString()}</td>
                  <td className="py-4">{ev.weight_kg ? `${ev.weight_kg} kg` : '-'}</td>
                  <td className="py-4">{ev.body_fat_pct ? `${ev.body_fat_pct}%` : '-'}</td>
                  <td className="py-4">{ev.muscle_mass_kg ? `${ev.muscle_mass_kg} kg` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
