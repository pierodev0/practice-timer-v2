import { useRoutineStore } from '../../stores/useRoutineStore.js';
import { useSessionStore } from '../../stores/useSessionStore.js';
import { downloadJSON } from '../../lib/utils.js';
import { RoutineService } from '../../application/routines/RoutineService.js';

export function useDataManager() {
  const routineStore = useRoutineStore();
  const sessionStore = useSessionStore();
  const routineService = new RoutineService({ routineStore });

  function exportAllData() {
    downloadJSON(
      JSON.stringify({
        routines: routineStore.routines,
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
        routineStore.routines = json.routines || [];
        sessionStore.stats = json.stats || sessionStore.stats;
        sessionStore.sessions = json.sessions || [];
        routineStore.currentRoutineId = routineStore.routines[0]?.id || 'module-1';
        routineStore.routines.forEach(r => {
          r.exercises.forEach(e => {
            e.completed = false;
            e.remainingSec = e.durationSec;
            e.currentRep = 1;
          });
        });
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
