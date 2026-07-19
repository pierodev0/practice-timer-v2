/**
 * SettingsView — app settings, backup, cloud sync.
 * Migrated from js/views/settings.js + html from index.html
 */

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '../stores/useAppStore.js';
import { downloadJSON } from '../../js/utils.js';
import { useFirebaseAuth } from '../composables/useFirebaseAuth.js';
import { useCloudSync } from '../composables/useCloudSync.js';

const store = useAppStore();
const router = useRouter();
const auth = useFirebaseAuth();
const cloudSync = useCloudSync();

const showBackupManager = ref(false);

function goToStats() {
  router.push({ name: 'stats' });
}

function exportAllData() {
  downloadJSON(
    JSON.stringify({ routines: store.routines, stats: store.stats, sessions: store.sessions }, null, 2),
    `backup_${new Date().toISOString().slice(0, 10)}.json`
  );
}

function triggerRestore() {
  document.getElementById('settings-restore-input').click();
}

function restoreAllData(e) {
  const file = e.target.files?.[0];
  if (!file || !confirm('Esto sobreescribirá todos los datos actuales. ¿Continuar?')) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const json = JSON.parse(evt.target.result);
      store.routines = json.routines || [];
      store.stats = json.stats || store.stats;
      store.sessions = json.sessions || [];
      store.currentRoutineId = store.routines[0]?.id || 'module-1';
      store.saveData(true);
      // Reset routine
      if (store.isExercisePlaying) {
        // pause sequence - skip for now
      }
      store.activeExerciseId = null;
      store.exerciseRemaining = 0;
      store.globalSeconds = 0;
      store.currentRoutine.exercises.forEach(e => {
        e.completed = false;
        e.remainingSec = e.durationSec;
        e.currentRep = 1;
      });
      store.saveData(true);
      alert('Restauración completa.');
    } catch (err) {
      alert('Error al restaurar: ' + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function deleteAllData() {
  if (!confirm('⚠️ ¿Estás seguro?\n\nEsta acción borrará TODOS tus datos...')) return;
  if (prompt('Escribe "BORRAR" para confirmar:') !== 'BORRAR') {
    alert('Cancelado.');
    return;
  }
  store.resetAllData();
  alert('Todos los datos han sido eliminados.');
}

async function login() {
  try {
    await auth.login();
  } catch (err) {
    alert('Error al iniciar sesión: ' + err.message);
  }
}

async function logout() {
  try {
    await auth.logout();
  } catch (err) {
    console.error('Logout failed:', err);
  }
}

async function syncNowAction() {
  if (!auth.isLoggedIn()) return;
  try {
    await cloudSync.syncNow();
  } catch (err) {
    alert('Error al sincronizar: ' + (err?.message || ''));
  }
}
</script>

<template>
  <div class="view-section active flex flex-col">
    <div class="bg-[#E53935] text-white p-4 pt-6 pb-4 shadow-md flex justify-between items-center sticky top-0 z-20">
      <h2 class="text-lg font-medium"><i class="fas fa-cog mr-2"></i>Ajustes</h2>
      <div class="w-8"></div>
    </div>

    <div class="p-4 space-y-4 pb-12 overflow-y-auto">
      <!-- Stats link -->
      <div class="card p-4 cursor-pointer hover:bg-gray-50 transition-colors" @click="goToStats">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
            <i class="fas fa-chart-line"></i>
          </div>
          <div>
            <p class="font-medium text-gray-800 text-sm">Estadísticas y Progreso</p>
            <p class="text-xs text-gray-400">Ver gráficos y datos de práctica</p>
          </div>
        </div>
      </div>

      <!-- Backup -->
      <div class="card p-4">
        <h3 class="text-xs uppercase text-gray-500 font-bold tracking-wider mb-3">Copia de Seguridad</h3>
        <div class="space-y-3">
          <button @click="exportAllData" class="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-left">
            <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><i class="fas fa-save"></i></div>
            <div>
              <p class="font-medium text-gray-800 text-sm">Backup Completo</p>
              <p class="text-xs text-gray-400">Exportar todas las rutinas + estadísticas</p>
            </div>
          </button>
          <button @click="triggerRestore" class="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-left">
            <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600"><i class="fas fa-exclamation-triangle"></i></div>
            <div>
              <p class="font-medium text-gray-800 text-sm">Restaurar Backup</p>
              <p class="text-xs text-gray-400">Sobreescribe todos los datos actuales</p>
            </div>
          </button>
          <input type="file" id="settings-restore-input" class="hidden" accept=".json" @change="restoreAllData">
        </div>
      </div>

      <!-- Cloud Sync -->
      <div class="card p-4">
        <h3 class="text-xs uppercase text-gray-500 font-bold tracking-wider mb-3"><i class="fas fa-cloud mr-1"></i>Sincronización Cloud</h3>
        <div class="flex items-center gap-3 p-3 rounded-lg bg-green-50">
          <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600"><i class="fas fa-cloud"></i></div>
          <div>
            <p class="font-medium text-gray-800 text-sm truncate">{{ auth.user?.email || 'No conectado' }}</p>
            <p class="text-xs text-gray-400">{{ auth.user ? 'Conectado' : 'Sin sesión' }}</p>
          </div>
        </div>
        <button @click="login" class="w-full mt-2 flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-left">
          <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><i class="fab fa-google"></i></div>
          <div>
            <p class="font-medium text-gray-800 text-sm">Iniciar sesión con Google</p>
            <p class="text-xs text-gray-400">Activa la sincronización en la nube</p>
          </div>
        </button>
        <button @click="syncNowAction" class="w-full mt-2 flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-left">
          <div class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600"><i class="fas fa-sync-alt"></i></div>
          <div>
            <p class="font-medium text-gray-800 text-sm">Sincronizar ahora</p>
            <p class="text-xs text-gray-400">{{ cloudSync.lastSyncTime.value ? `Última: ${new Date(cloudSync.lastSyncTime.value).toLocaleString()}` : 'Sube y descarga los últimos cambios' }}</p>
          </div>
        </button>
        <button @click="logout" class="w-full mt-2 flex items-center gap-3 p-3 rounded-lg bg-red-50 hover:bg-red-100 transition-colors text-left">
          <div class="w-10 h-10 rounded-full bg-red-200 flex items-center justify-center text-red-700"><i class="fas fa-sign-out-alt"></i></div>
          <div>
            <p class="font-medium text-red-800 text-sm">Cerrar sesión</p>
            <p class="text-xs text-red-500">Desconectar sincronización cloud</p>
          </div>
        </button>
      </div>

      <!-- Danger Zone -->
      <div class="card p-4 border border-red-200">
        <h3 class="text-xs uppercase text-red-500 font-bold tracking-wider mb-3">Zona de Peligro</h3>
        <button @click="deleteAllData" class="w-full flex items-center gap-3 p-3 rounded-lg bg-red-50 hover:bg-red-100 transition-colors text-left">
          <div class="w-10 h-10 rounded-full bg-red-200 flex items-center justify-center text-red-700"><i class="fas fa-trash-alt"></i></div>
          <div>
            <p class="font-medium text-red-800 text-sm">Borrar Todos los Datos</p>
            <p class="text-xs text-red-500">Elimina rutinas, estadísticas e historial</p>
          </div>
        </button>
      </div>

      <!-- App Info -->
      <div class="card p-4 text-center text-xs text-gray-400">
        <p>Music Routine App v2 &mdash; PWA</p>
      </div>
    </div>
  </div>
</template>
