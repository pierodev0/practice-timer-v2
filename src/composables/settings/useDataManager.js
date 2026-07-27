import { useRoutineStore } from '../../stores/useRoutineStore.js';
import { useExerciseStore } from '../../stores/useExerciseStore.js';
import { useSessionStore } from '../../stores/useSessionStore.js';
import { downloadJSON } from '../../lib/utils.js';
import { RoutineService } from '../../application/routines/RoutineService.js';

export function useDataManager() {
  const routineStore = useRoutineStore();
  const exerciseStore = useExerciseStore();
  const sessionStore = useSessionStore();
  const routineService = new RoutineService({ routineStore, exerciseStore });

  function exportAllData() {
    downloadJSON(
      JSON.stringify({
        routines: routineStore.routines,
        exercises: exerciseStore.exercises,
        stats: sessionStore.stats,
        sessions: sessionStore.sessions,
      }, null, 2),
      `backup_${new Date().toISOString().slice(0, 10)}.json`
    );
  }

  function restoreAllData(e) {
    const file = e.target.files?.[0];
    if (!file || !confirm('Esto sobreescribirá todos los datos actuales. ¿Continuar?')) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target.result);
        // Backward compat: si routines tienen exercises embebidos, aplanarlos
        let routines = json.routines || [];
        let exercises = json.exercises || [];
        if (routines.length > 0 && routines[0].exercises) {
          exercises = routines.flatMap(r =>
            (r.exercises || []).map((ex, i) => ({ ...ex, routineId: r.id, order: i }))
          );
          routines = routines.map(r => ({ id: r.id, name: r.name, createdAt: r.createdAt }));
        }
        routineStore.setRoutines(routines);
        exerciseStore.setAll(exercises);
        sessionStore.stats = json.stats || sessionStore.stats;
        sessionStore.sessions = json.sessions || [];
        routineStore.setCurrentRoutine(routines[0]?.id || null);
        routineService.saveAllToStorage();
        sessionStore.saveToStorage();
        alert('Restauración completa.');
      } catch (err) {
        alert('Error al restaurar: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  async function deleteAllData() {
    if (!confirm('⚠️ ¿Estás seguro?\n\nEsta acción borrará TODOS tus datos...')) return;
    if (prompt('Escribe "BORRAR" para confirmar:') !== 'BORRAR') {
      alert('Cancelado.');
      return;
    }
    await routineService.resetToDefaults();
    sessionStore.resetAll();
    sessionStore.saveToStorage();
    alert('Todos los datos han sido eliminados.');
  }

  return {
    exportAllData,
    restoreAllData,
    deleteAllData,
  };
}
