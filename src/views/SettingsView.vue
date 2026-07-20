/**
 * SettingsView — app settings, backup, cloud sync.
 * Pure presentation: all logic delegated to composables.
 */

<script setup>
import { useRouter } from 'vue-router';
import { useFirebaseAuth } from '../composables/useFirebaseAuth.js';
import { useCloudSync } from '../composables/useCloudSync.js';
import { useSessionHistory } from '../composables/useSessionHistory.js';

const router = useRouter();
const auth = useFirebaseAuth();
const cloudSync = useCloudSync();
const { exportAllData, restoreAllData, deleteAllData } = useSessionHistory();

function goToStats() {
  router.push({ name: 'stats' });
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
          <button @click="$refs.restoreInput.click()" class="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-left">
            <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600"><i class="fas fa-exclamation-triangle"></i></div>
            <div>
              <p class="font-medium text-gray-800 text-sm">Restaurar Backup</p>
              <p class="text-xs text-gray-400">Sobreescribe todos los datos actuales</p>
            </div>
          </button>
          <input type="file" ref="restoreInput" class="hidden" accept=".json" @change="restoreAllData">
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
