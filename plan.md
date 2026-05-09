# Plan de Refactorización — Music Routine App

## 📋 Estado Actual (Monolito)

Actualmente toda la aplicación vive en un único archivo `index.html` que contiene:

- **HTML** (~250 líneas) — Marcado de vistas, modales, sidebars
- **CSS** (~40 líneas) — Tailwind `@layer components` + estilos globales en `<style>`
- **JavaScript** (~800 líneas) — Toda la lógica en un solo bloque `<script>`:
  - Estado global y persistencia (`state`, `localStorage`)
  - Web Worker en Blob para el timer
  - Tone.js para metrónomo y sonidos
  - Lógica de ejercicios, rutinas, reproducción
  - Renderizado de vistas (Dashboard, Details, Stats)
  - Sidebar, modales y drag & drop (Sortable)
  - Gráficas con Chart.js
  - Import/Export de rutinas y backups

**Problemas del monolito:**
- Todo está acoplado: cambiar un detalle de UI puede romper el audio o el estado
- Dificultad para testear, mantener o escalar
- Sin separación de responsabilidades
- El Worker se construye como Blob (no es un archivo real)
- Difícil colaboración entre múltiples desarrolladores

---

## 🎯 Objetivo

Mantener **los mismos lenguajes y funcionalidades** (HTML + CSS + JS, PWA, metrónomo, estadísticas, rutinas), pero con una estructura de carpetas modular, escalable y mantenible.

---

## 📁 Estructura Propuesta

```
/
├── index.html               # Punto de entrada mínimo (solo HTML estructural)
├── manifest.json            # PWA manifest (igual)
├── sw.js                    # Service Worker (igual, pero URLs actualizadas)
├── icon-192.png
├── icon-512.png
│
├── css/
│   └── styles.css           # Todo el CSS (Tailwind layers + estilos globales)
│
└── js/
    ├── app.js               # Entry point: inicialización y orquestación
    ├── state.js              # Estado global + persistencia (localStorage)
    ├── audio.js              # Tone.js, metrónomo, sonidos
    ├── worker.js             # Web Worker real (archivo separado, no Blob)
    ├── utils.js              # Funciones puras: formatTime, stringToColor, etc.
    │
    └── views/
        ├── dashboard.js      # Lista de ejercicios, reproducción, progreso
        ├── details.js        # Vista detalle: editar ejercicio, comentarios, stats
        ├── sidebar.js        # Menú lateral, rutinas, import/export
        ├── stats.js          # Estadísticas, gráficas (Chart.js)
        └── modals.js         # Modales: crear ejercicio, lightbox, editar stats
```

---

## 🔄 Mapa de Migración (Función por Función)

### 1. `js/utils.js` — Utilidades puras (~15 funciones)

| Función Actual | Nueva Ubicación |
|---|---|
| `formatTime(s)` | `utils.js` → `export function formatTime(s)` |
| `stringToColor(str)` | `utils.js` → `export function stringToColor(str)` |
| `getFirstUrl(text)` | `utils.js` → `export function getFirstUrl(text)` |
| `getFirstImage(text)` | `utils.js` → `export function getFirstImage(text)` |
| `downloadJSON(content, filename)` | `utils.js` → `export function downloadJSON(content, filename)` |
| `sanitizeImportedRoutine(r)` | `utils.js` → `export function sanitizeImportedRoutine(r)` |

### 2. `js/state.js` — Estado y persistencia (~10 funciones)

| Función Actual | Descripción |
|---|---|
| `state` (objeto global) | Mover a módulo con getters/setters |
| `saveData()` | Persistir estado completo en localStorage |
| `loadData()` | Cargar y migrar datos antiguos |
| `getCurrentRoutine()` | Getter robusto con fallback |
| `getExerciseById(id)` | Buscar ejercicio en rutina actual |
| `recordProgressSeconds(sec)` | Acumular tiempo de práctica |
| `STORAGE_KEY` | Constante |

**Mejora:** Usar un patrón de store simple con suscripciones opcionales (`subscribe(fn)`).

### 3. `js/worker.js` — Web Worker (archivo real)

**Cambio:** El Blob actual se reemplaza por un archivo físico `js/worker.js`.

```js
// Antes (Blob dentro del HTML):
const workerCode = `let intervalId; ...`;
const blob = new Blob([workerCode], { type: "application/javascript" });
const worker = new Worker(URL.createObjectURL(blob));

// Después (archivo real):
const worker = new Worker('./js/worker.js');
```

### 4. `js/audio.js` — Audio y metrónomo (~6 funciones)

| Función Actual | Descripción |
|---|---|
| `initAudio()` | Inicializar Tone.js, crear sintetizadores |
| `playBellSound()` | Sonido de finalización |
| `startMetronomeAudio()` | Iniciar Transport de Tone |
| `stopMetronomeAudio()` | Detener Transport |
| `toggleGlobalAudioOnly()` | Encender/apagar audio global |
| `metroSynth`, `bellSynth`, `beat` | Variables internas del módulo |

### 5. `js/views/dashboard.js` — Vista principal (~12 funciones)

| Función Actual | Descripción |
|---|---|
| `renderExercises()` | Renderizar la lista de ejercicios |
| `playExercise(id)` | Iniciar reproducción de un ejercicio |
| `pauseSequence()` | Pausar ejercicio activo |
| `toggleListExercise(id)` | Play/Pausa desde la lista |
| `handleExerciseCompletion()` | Manejar fin de ejercicio (modal stat o avance) |
| `finalizeCompletion(playSound)` | Avanzar repetición o marcar completado |
| `submitStatInput()` / `skipStatInput()` | Manejar modal de estadística |
| `closeStatModalAndFinish()` | Cerrar modal y continuar flujo |
| `finishAndResetRoutine()` | Finalizar rutina completa |
| `resetRoutineLogic()` | Resetear toda la rutina |
| `adjustGlobalBPM(val)` | Ajustar BPM global |
| `resetCurrentDetailExercise()` | Resetear ejercicio desde detalle |

### 6. `js/views/details.js` — Vista detalle (~15 funciones)

| Función Actual | Descripción |
|---|---|
| `openDetailsView(id)` | Abrir vista detalle con datos del ejercicio |
| `closeDetailsView()` | Cerrar y volver al dashboard |
| `toggleDetailPlay()` | Play/Pausa desde detalle |
| `completeDetailExercise()` | Completar manualmente desde detalle |
| `forceFinishDetail()` | Forzar finalización (después de stat modal) |
| `updateDetailTitle(val)` | Actualizar título |
| `updateDetailStatName(val)` | Actualizar nombre de estadística |
| `adjustDetailBPM(v)` | Ajustar BPM en detalle |
| `adjustDetailReps(v)` | Ajustar repeticiones |
| `adjustDetailTime(type, val)` | Ajustar duración |
| `updateDetailAutoStart(c)` | Actualizar auto-start |
| `updateComment(v)` | Actualizar comentario |
| `duplicateExercise()` | Duplicar ejercicio |
| `archiveExercise()` | Archivar ejercicio |
| `deleteDetailExercise()` | Eliminar ejercicio |
| `toggleDetailsMenu(e)` | Menú desplegable de acciones |
| `renderCommentAttachments(text)` | Renderizar imágenes y links del comentario |

### 7. `js/views/sidebar.js` — Sidebar y rutinas (~8 funciones)

| Función Actual | Descripción |
|---|---|
| `toggleSidebar(show)` | Abrir/cerrar sidebar |
| `renderSidebarRoutines()` | Renderizar lista de rutinas |
| `switchRoutine(id)` | Cambiar de rutina |
| `showAddRoutineInput()` | Crear nueva rutina |
| `renameRoutine(id)` | Renombrar rutina |
| `deleteRoutine(id)` | Eliminar rutina |
| `exportSingleRoutine(id)` | Exportar una rutina |
| `exportRoutines()` | Backup completo |
| `triggerSmartImport()` / `importSmartRoutines(input)` | Importar rutinas |
| `triggerFullRestore()` / `restoreAllRoutines(input)` | Restaurar backup |
| `showArchivedCount()` | Mostrar archivos |

### 8. `js/views/stats.js` — Estadísticas y gráficas (~3 funciones + Chart.js)

| Función Actual | Descripción |
|---|---|
| `openStatsView()` | Abrir vista de stats |
| `closeStatsView()` | Cerrar vista de stats |
| `renderStats()` | Renderizar todas las gráficas y métricas |
| `openEditStatsModal()` | Modal para editar/eliminar logs |
| `editStatValue(rId, eId, index)` | Editar valor de log |
| `deleteStatLog(rId, eId, index)` | Eliminar log |
| Variables: `weeklyChartInstance`, `routineChartInstance`, `progressChartInstance` | Mantener instancias de Chart.js |

### 9. `js/views/modals.js` — Modales (~6 funciones)

| Función Actual | Descripción |
|---|---|
| `toggleModal(show)` | Mostrar/ocultar modal de crear ejercicio |
| `addNewExercise()` | Crear ejercicio desde el modal |
| `adjustNewBPM(v)` | Ajustar BPM en modal |
| `adjustNewReps(v)` | Ajustar reps en modal |
| `adjustNewTime(type, val)` | Ajustar tiempo en modal |
| `openImageModal(url)` | Lightbox de imagen |
| `closeImageModal()` | Cerrar lightbox |
| `handleWindowClick(e)` | Cerrar menú desplegable al hacer clic fuera |

### 10. `js/app.js` — Entry point (~5 funciones)

| Función Actual | Descripción |
|---|---|
| `window.onload` | Inicialización: loadData, Sortable, updateUI |
| `updateUI()` | Orquestar actualización completa de UI |
| `toggleAutoplay(c)` | Alternar autoplay |
| Registro de Service Worker | Mover aquí |
| Suscripción a eventos globales | `beforeunload`, `onclick` delegado |

---

## 🧩 Dependencias Entre Módulos

```
app.js
 ├── state.js        (import)
 ├── audio.js        (import)
 ├── utils.js        (import)
 ├── views/dashboard (import) → usa state, audio, utils
 ├── views/details   (import) → usa state, audio, utils
 ├── views/sidebar   (import) → usa state, utils
 ├── views/stats     (import) → usa state, utils
 └── views/modals    (import) → usa state, utils
```

**Regla estricta:** Los módulos de `views/` nunca se importan entre sí. Toda comunicación entre vistas se hace a través del `state` (pub/sub) o mediante callbacks definidos en `app.js`.

---

## 🏗️ Patrón de Arquitectura

### Store central (state.js)

```js
// state.js
const state = {
  routines: [],
  currentRoutineId: null,
  isExercisePlaying: false,
  isAudioOn: false,
  bpm: 120,
  globalSeconds: 0,
  activeExerciseId: null,
  exerciseRemaining: 0,
  viewingExerciseId: null,
  autoplayRoutine: false,
  pendingDetailCompletion: false,
  newExerciseForm: { bpm: 100, min: 2, sec: 0, reps: 1 },
  stats: {}
};

const subscribers = [];

export function getState() { return state; }
export function subscribe(fn) { subscribers.push(fn); }
function notify() { subscribers.forEach(fn => fn(state)); }

export function saveData() { ... notify(); }
export function loadData() { ... }
```

### Inicialización (app.js)

```js
import { loadData, subscribe } from './state.js';
import { initAudio } from './audio.js';
import { renderExercises, updateUI } from './views/dashboard.js';
import { renderSidebarRoutines } from './views/sidebar.js';

window.onload = function() {
  loadData();
  initAudio();
  registerSW();
  setupSortable();
  setupGlobalListeners();
  updateUI();
};
```

---

## ✅ Ventajas de la Refactorización

| Aspecto | Antes (Monolito) | Después (Modular) |
|---|---|---|
| **Organización** | Un solo HTML de 1200+ líneas | Archivos pequeños < 200 líneas c/u |
| **Mantenibilidad** | Cambiar algo requiere leer todo | Cada módulo tiene una responsabilidad |
| **Testabilidad** | No testeable | Funciones puras en utils.js son 100% testeables |
| **Colaboración** | Conflictos en git en cada cambio | Múltiples devs en paralelo sin conflictos |
| **Worker** | Blob inline (poco legible) | Archivo real `worker.js` |
| **Carga inicial** | Toda la lógica bloquea el parseo | Módulos se cargan bajo demanda |
| **Escalabilidad** | Añadir features = más spaghetti | Cada feature nueva = nuevo archivo |

---

## 🚧 Plan de Ejecución (Orden Sugerido)

| Paso | Archivo | Esfuerzo |
|---|---|---|
| 1 | `js/utils.js` | ⭐ (fácil, funciones puras sin dependencias) |
| 2 | `js/worker.js` | ⭐ (solo extraer el código del Blob) |
| 3 | `js/state.js` | ⭐⭐ (refactorizar estado y persistencia) |
| 4 | `js/audio.js` | ⭐⭐ (aislar Tone.js) |
| 5 | `js/views/modals.js` | ⭐⭐ (modales autocontenidos) |
| 6 | `js/views/sidebar.js` | ⭐⭐ (sidebar + rutinas) |
| 7 | `js/views/dashboard.js` | ⭐⭐⭐ (lógica central más compleja) |
| 8 | `js/views/details.js` | ⭐⭐⭐ (muchas funciones de edición) |
| 9 | `js/views/stats.js` | ⭐⭐⭐ (Chart.js, filtros, edición de logs) |
| 10 | `js/app.js` | ⭐⭐ (orquestación) |
| 11 | `css/styles.css` | ⭐ (extraer de `<style>`) |
| 12 | `index.html` | ⭐⭐ (limpiar, quitar inline JS/CSS) |

**Total estimado:** 3-4 horas de trabajo efectivo.

---

## ⚠️ Consideraciones Técnicas

1. **Eventos inline (`onclick`):** Migrar a `addEventListener` en los módulos correspondientes. Los elementos del DOM tendrán `id` o `data-*` attributes.

2. **Sortable.js:** Se inicializa en `app.js` después de que el DOM esté listo.

3. **Chart.js:** Las instancias se guardan como variables de módulo en `stats.js`.

4. **Tone.js:** Se inicializa bajo demanda (lazy) desde `audio.js`.

5. **Service Worker:** Se registra en `app.js`, el archivo `sw.js` se mantiene igual pero actualizando las URLs de los assets cacheados.

6. **Vite como Build Tool:** Se usa Vite + `@tailwindcss/vite` para desarrollo y build. Tailwind CSS se instala como npm package (v4) en vez de CDN. Las librerías que no tienen bundle npm (FontAwesome, Sortable, Chart.js, Tone.js) siguen cargándose como CDN.

7. **PWA:** Los archivos del Service Worker (`sw.js`, `manifest.json`, icons) se colocan en `public/` para que Vite los copie al `dist/` sin transformación.

8. **Web Worker:** Se usa `new Worker(new URL('./worker.js', import.meta.url))` para compatibilidad con Vite en build de producción.

9. **Compatibilidad:** Se usa `type="module"` en el `<script>` principal. El resto de librerías se cargan como scripts globales (CDN).

---

## 📐 Ejemplo de Código Post-Refactor

### `index.html` (simplificado)

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Music Routine App</title>
  <link rel="manifest" href="manifest.json">
  <link rel="stylesheet" href="css/styles.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.0/Sortable.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js"></script>
</head>
<body>
  <!-- Estructura HTML idéntica pero sin eventos inline -->
  <!-- Cada elemento tiene id/data-attributes manejados por JS -->
  <script type="module" src="js/app.js"></script>
</body>
</html>
```

### `js/utils.js`

```js
export function formatTime(seconds) {
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
}

export function getFirstUrl(text) {
  return (text.match(/(https?:\/\/[^\s]+)/i) || [])[0];
}

export function getFirstImage(text) {
  return (text.match(/(https?:\/\/[^\s]*\.(?:png|jpg|jpeg|gif|webp|svg)[^\s]*)/i) || [])[0];
}

export function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return '#' + "00000".substring(0, 6 - (hash & 0x00FFFFFF).toString(16).toUpperCase().length) + (hash & 0x00FFFFFF).toString(16).toUpperCase();
}

export function downloadJSON(content, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type: "application/json" }));
  a.download = filename;
  a.click();
}
```

---

## 🧪 Prueba de Regresión

Después de la refactorización, verificar que todo funciona:

- [ ] Crear/editar/eliminar ejercicios
- [ ] Play/Pausa con metrónomo
- [ ] Web Worker corriendo en background
- [ ] Flujo de repeticiones
- [ ] Modales (crear, stat, lightbox)
- [ ] Sidebar (rutinas, import/export)
- [ ] Vista detalle (todos los campos)
- [ ] Estadísticas y gráficas
- [ ] Persistencia (recargar página conserva estado)
- [ ] Service Worker offline
- [ ] Arrastrar para reordenar (Sortable)
- [ ] Autoplay entre ejercicios
