# Music Routine App 🎵

> **Organiza y cronometra tus rutinas de práctica musical.**
> Crea ejercicios con tiempo, BPM y repeticiones. El metrónomo integrado te marca el ritmo
> mientras un timer preciso (Web Worker) lleva la cuenta. Al finalizar cada ronda, registra
> estadísticas opcionales y visualiza tu progreso con gráficas e historial. Exporta a Excel.
> Sincroniza tus datos entre dispositivos con Firebase. Todo funciona offline como PWA.

---

## Tech Stack

| Capa | Tecnología |
|---|---|
| **Framework** | [Vue 3](https://vuejs.org) (Composition API + `<script setup>`) |
| **Routing** | [Vue Router 5](https://router.vuejs.org) (hash history) |
| **State Management** | [Pinia 4](https://pinia.vuejs.org) |
| **Bundler** | [Vite 8](https://vite.dev) (Rolldown) |
| **Package Manager** | [pnpm](https://pnpm.io) |
| **CSS** | [Tailwind CSS v4](https://tailwindcss.com) (via npm, `@tailwindcss/vite`) |
| **Icons** | [Font Awesome 6](https://fontawesome.com) (CDN) |
| **Database** | [Dexie.js v4](https://dexie.org) (IndexedDB wrapper) |
| **Charts** | [Chart.js](https://www.chartjs.org) (CDN) |
| **Audio / Metrónomo** | [Tone.js](https://tonejs.github.io) (CDN) |
| **Drag & Drop** | [Sortable.js](https://sortablejs.github.io/Sortable/) (CDN) |
| **Excel Export** | [ExcelJS](https://github.com/exceljs/exceljs) (CDN) |
| **Date Formatting** | [date-fns](https://date-fns.org) |
| **ID Generation** | [nanoid](https://github.com/ai/nanoid) |
| **Cloud Sync** | [Firebase Auth](https://firebase.google.com/docs/auth) + [Firestore](https://firebase.google.com/docs/firestore) |
| **PWA** | Service Worker + Web Manifest |

### Testing

| Herramienta | Propósito |
|---|---|
| [Vitest](https://vitest.dev) | Test runner (compatible con Vite) |
| [jsdom](https://github.com/jsdom/jsdom) | Entorno DOM para tests |
| [@vue/test-utils](https://test-utils.vuejs.org) | Testing de componentes Vue |
| [fake-indexeddb](https://github.com/dumbmatter/fakeIndexedDB) | Mock de IndexedDB en tests |

---

## Quick Start

```bash
# Install dependencies
pnpm install

# Start dev server (http://localhost:5173)
pnpm run dev

# Production build → dist/
pnpm run build

# Preview production build
pnpm run preview

# Run tests (152 tests, 13 files)
pnpm test

# Run tests in watch mode
pnpm run test:watch
```

---

## Features

### 🎯 Practice Timer
- Start/stop per-exercise countdown with Web Worker precision (funciona incluso con el tab oculto)
- Metrónomo (Tone.js) con BPM configurable por ejercicio
- Auto-advance entre ejercicios o progresión manual
- Repeticiones: repetir cada ejercicio N veces antes de marcarlo completo
- Estadísticas opcionales por ejercicio (numérico, por sesión)

### 📋 Routine Management
- Crear, renombrar, eliminar rutinas
- Drag & drop para reordenar ejercicios (Sortable.js)
- Archivar ejercicios (ocultar de la vista de práctica)
- Importar/exportar rutinas individuales como JSON
- 12 rutinas pre-cargadas del curso JustinGuitar Beginner

### 📊 Statistics & Charts
- Tiempo de práctica diario tracking automático vía Dexie/IndexedDB
- Chart.js: 4 gráficos (semanal por día, donut por rutina, línea de progreso, barra programado vs real)
- Stats por ejercicio (ej: "Changes", "Clean Hits")
- Racha de días consecutivos de práctica
- Filtro de rango de fechas (7, 30, 90 días)

### 📜 History
- Vista mensual con sesiones agrupadas por día
- Cada sesión muestra ejercicios completados con BPM, reps, duración
- Exportación a Excel (.xlsx) por día o mes completo
- Editar fecha y eliminar sesiones
- Los nombres de rutinas se resuelven en tiempo real (refleja renombres)

### ⚙️ Settings
- Backup: exportar todos los datos (rutinas + stats + sesiones) como JSON
- Restore: importar un backup (sobrescribe todos los datos)
- Eliminar todos los datos con doble confirmación (escribir "BORRAR")
- Ver ejercicios archivados
- Link a la página de estadísticas

### ☁️ Cloud Sync (Firebase)
- Login con Google mediante popup, con sesión persistida en IndexedDB/localStorage
- Botón "Sync Now": sube y descarga los últimos cambios
- Auto-sync toggle: subida automática con debounce de 2s
- Sincronización en tiempo real vía `onSnapshot` de Firestore
- Indicador de estado de sync (synced/syncing/offline/error)
- Estrategia last-write-wins
- Offline-first: la app funciona sin login; cloud es opcional

### 📱 PWA
- Funciona offline vía Service Worker caching
- Instalable en mobile/desktop
- Todos los datos persisten en IndexedDB vía Dexie

---

## Data Architecture

| Almacenamiento | Propósito |
|---|---|
| **Dexie / IndexedDB** | Datos principales: rutinas, ejercicios, sesiones, logs (6 tablas normalizadas) |
| **localStorage** | BPM global (`musicRoutineApp_bpm`) |
| **Firebase Firestore** | Cloud sync layer (opcional, offline-safe) |
| **Service Worker Cache** | Assets estáticos para funcionamiento offline |

### Dexie Schema (6 tablas)

| Tabla | Key | Descripción |
|---|---|---|
| `routines` | `&id` | Rutinas con nombre y metadatos |
| `exercises` | `&id` | Ejercicios independientes |
| `routineExercises` | `++` | Junction: rutina → ejercicio con orden |
| `sessions` | `&id` | Sesiones de práctica completadas |
| `sessionExercises` | `++` | Junction: sesión → ejercicio con datos |
| `exerciseLogs` | `++` | Logs de estadísticas por ejercicio |

---

## Scripts Reference

| Command | Description |
|---|---|
| `pnpm run dev` | Start Vite dev server |
| `pnpm run build` | Production build to `dist/` |
| `pnpm run preview` | Serve production build locally |
| `pnpm test` | Run all tests (Vitest) |
| `pnpm run test:watch` | Run tests in watch mode |

---

## Migration History

This app was originally a single HTML file (~1145 lines) containing inline HTML, CSS, and JavaScript.
It has been progressively refactored through several phases.

| Fase | Commit | Descripción |
|---|---|---|
| 1 | — | Vanilla JS, SPA en un solo archivo HTML |
| 2 | `5ed173a` | Migración a Vue 3 + Pinia + Vite |
| 3 | `da63b4c` | Refactor SOLID: stores/composables/views separados |
| 4 | `4fabd82` | Migración de localStorage a Dexie (IndexedDB) |
| 5 | *actual* | Migración de `js/` a `src/` con estructura limpia |

---

## Environment Variables (Firebase)

The Firebase config is hardcoded in `src/services/firebaseConfig.js`. No `.env` file needed for deployment.

---

## License

MIT
