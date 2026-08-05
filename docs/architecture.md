# Arquitectura — Practice Timer v2

> **Propósito**: Documentar el patrón arquitectónico para toda la app.
> **Por qué este documento**: Cada refactor (rutinas → ejercicios → sesiones → settings) debe seguir el mismo patrón. Esto evita tener 4 arquitecturas distintas conviviendo.
> **Estado**: En implementación (rama `feat/domain-entities`)

---

## Stack

| Capa | Tecnología |
|---|---|
| UI | Vue 3 (Composition API, SFC) |
| Estado | Pinia (`defineStore`) |
| Persistencia | Dexie (IndexedDB) |
| Pruebas | Vitest |
| Build | Vite |

No hay backend. Todo es client-side.

---

## El problema

Hoy el código mezcla responsabilidades. Un ejemplo concreto (`_doSave` en `useRoutineStore`):

```js
// useRoutineStore.js — store de Pinia
async function _doSave() {
  // 1. Lee de Dexie
  const existingRoutines = await routineRepository.all();
  // 2. Borra lo que no está en cache
  for (const er of existingRoutines) {
    if (!routineIds.includes(er.id)) {
      await routineRepository.remove(er.id);
    }
  }
  // 3. Escribe TODO de vuelta
  for (const r of routines.value) {
    // ...
  }
}
```

El store **hace persistencia**. Si mañana cambia la DB, o queremos cache en memoria, o sincronizar con un backend, hay que tocar el store.

Al mismo tiempo, el `RoutineService` **muta el estado del store directamente**:

```js
// RoutineService.js
async addRoutine({ id, name, exercises }) {
  this._routineStore.routines.push({ id, name, exercises });
  await this._routineStore.saveToStorage();
}
```

Dos problemas:
1. El service toca `routines.value` como si fuera público (acoplamiento a la implementación interna de Pinia)
2. El store hace I/O (no debería)

---

## La solución: separación estricta

```
┌───────────────────────────────────────────────────────────────┐
│ VIEW (DashboardView.vue)                                      │
│  └─ Presentación pura.                                        │
│     Cero imports a stores / repos / domain.                   │
│     Solo llama composables.                                   │
│                                                                │
│ COMPOSABLE (useRoutineManager)                                │
│  └─ Orquesta UI + llama services.                             │
│     Lee estado del store (getters). NO escribe directo.       │
│                                                                │
│ SERVICE (RoutineService)                                      │
│  └─ Lógica de negocio. Orquesta: store + repos + factories.   │
│     Muta store (vía métodos públicos: addRoutine, etc).       │
│     Persiste con repos.                                       │
│     init() para carga + seed de datos al arrancar.            │
│                                                                │
│ STORE (useRoutineStore)       REPOSITORY (routineRepository)  │
│  └─ Solo estado + getters     └─ Solo Dexie CRUD              │
│     + mutaciones puras           Cero lógica de negocio.       │
│     Sin I/O, sin _ready,         No sabe que Pinia existe.     │
│     sin init, sin saveToStorage.                               │
│                                                                │
│ PERSISTENCE (routinePersistence)                              │
│  └─ I/O pesado (loadAll, saveAll, getDefaultRoutines)         │
│     Separado del store para que la store sea pura.            │
│     Service usa persistence para init y write-all legacy.      │
│                                                                │
│ DOMAIN FACTORIES (createExercise, createRoutine)              │
│  └─ Crean objetos, validan, transforman.                      │
│     Sin dependencias de framework. Sin new, sin class.        │
└───────────────────────────────────────────────────────────────┘
```

### Las reglas (en orden de importancia)

1. **Store no hace I/O** — sin `getDb()`, sin `saveToStorage()`, sin `loadFromDb()`, sin `_ready`, sin init IIFE. Solo `ref`, `computed`, y métodos puros que mutan arrays/objetos en memoria.

2. **Service no toca el estado del store directamente** (no `store.routines.push()`). Usa métodos públicos del store (`store.addRoutine(r)`).

3. **View no importa stores ni repos** — toda la comunicación va por composables.

4. **Composable solo LEE del store** (getters, state). No ESCRIBE directo — usa store.setCurrentRoutine(id) o delega al service.

5. **Repository no tiene lógica de negocio** — solo `create`, `getById`, `update`, `remove`, `all`. Cero `if` de negocio.

6. **Domain factories crean objetos consistentes** — un solo lugar para defaults, un solo lugar para transformaciones (`stripTransients`, `resetExercise`).

7. **init() en el service, no en el store** — el store no sabe que Dexie existe. El service orquesta la carga + seed de datos al arrancar la app.

---

## Domain Factories

No usamos clases (`class Exercise`). Usamos **funciones factory** que devuelven objetos planos.

**Por qué NO clases:**

| Problema | Clase | Factory |
|---|---|---|
| `JSON.stringify` pierde métodos | ❌ `ex.reset()` ya no existe | ✅ Sigue siendo objeto plano |
| Vue `reactive()` con prototype | ❌ Edge cases con getters/setters | ✅ Funciona siempre |
| Hidratar desde Dexie | ❌ Hay que hacer `new Exercise(data)` | ✅ `createExercise(data)` es 1:1 |
| `deepClone` (JSON.parse(JSON.stringify)) | ❌ Pierde prototype | ✅ Objeto plano, no hay nada que perder |

**Por qué factories en lugar de inline:**

```js
// ❌ ANTES: cada operación escribe los defaults a mano
const ex = {
  id: nanoid(),
  title: 'foo',
  bpm: 100,
  durationSec: 120,
  remainingSec: 120,
  completed: false,
  currentRep: 1,
  statisticLogs: [],
  // ...
};

// ✅ DESPUÉS: un solo lugar para defaults
const ex = createExercise({ title: 'foo', durationSec: 120 });
```

Si mañana agregamos un campo `goalType` al modelo, se cambia en UNA función y todas las creaciones lo heredan.

### Patrón de factory

```js
// src/domain/routines/Exercise.js

/**
 * Crear un ejercicio con todos los defaults.
 * @param {Object} data — campos a sobreescribir
 * @returns {Object} ejercicio normalizado
 */
export function createExercise(data = {}) {
  return {
    id: nanoid(),
    title: '',
    bpm: 100,
    durationSec: 60,
    remainingSec: 60,
    completed: false,
    currentRep: 1,
    autoStart: true,
    reps: 1,
    archived: false,
    comment: '',
    statisticName: null,
    statisticLogs: [],
    // data sobrescribe defaults
    ...data,
  };
}

/**
 * Remover campos transitorios antes de persistir.
 * @param {Object} ex
 * @returns {Object} solo campos que se guardan en Dexie
 */
export function stripTransients(ex) {
  const {
    statisticLogs, completed, remainingSec, currentRep,
    ...persistable
  } = ex;
  return persistable;
}

/**
 * Resetear un ejercicio a estado "sin empezar".
 * Muta el objeto en lugar de crear uno nuevo (útil en práctica).
 */
export function resetExercise(ex) {
  ex.completed = false;
  ex.remainingSec = ex.durationSec;
  ex.currentRep = 1;
}

/**
 * Duplicar ejercicio con nuevo ID.
 */
export function duplicateExercise(ex) {
  return createExercise({
    ...stripTransients(ex),
    id: nanoid(),
    statisticLogs: [],
    title: ex.title + ' (Copy)',
  });
}
```

### Patrón de factory para aggregate

```js
// src/domain/routines/Routine.js

export function createRoutine(data = {}) {
  return {
    id: nanoid(),
    name: '',
    exercises: [],
    createdAt: Date.now(),
    ...data,
  };
}

export function defaultRoutines() {
  return [
    createRoutine({ id: 'module-1', name: 'Module 1', exercises: [...] }),
    // ...
  ];
}
```

---

## Flujo completo: crear rutina

```js
// ── View (RoutinesView.vue) ──
<template>
  <button @click="showNewRoutineInput">Nueva Rutina</button>
</template>

<script setup>
const { showNewRoutineInput } = useRoutineManager();
</script>
```

```js
// ── Composable (useRoutineManager.js) ──
// NO importa store. Solo service + UI state.
export function useRoutineManager() {
  const routineStore = useRoutineStore();    // solo lectura de getters
  const routineService = new RoutineService();

  const sortedRoutines = computed(() =>
    [...routineStore.routines].sort(...)      // ✅ leer estado está bien
  );

  function switchRoutine(id) {
    routineStore.setCurrentRoutine(id);       // ✅ mutación vía método público
    router.push({ name: 'practice' });
  }

  async function showNewRoutineInput() {
    const name = prompt('Nueva rutina:');
    if (!name?.trim()) return;
    await routineService.addRoutine(name.trim());
  }

  return { showNewRoutineInput, sortedRoutines, switchRoutine };
}
```

```js
// ── Service (RoutineService.js) ──
export class RoutineService {
  constructor() {
    this.store = useRoutineStore();
  }

  async addRoutine(name) {
    const routine = createRoutine({ name, exercises: [] });
    this.store.addRoutine(routine);           // 1. muta estado (sync)
    await routineRepository.create(routine);  // 2. persiste (async)
  }
}
```

```js
// ── Store (useRoutineStore.js) — PURA, sin I/O ──
export const useRoutineStore = defineStore('routines', () => {
  const routines = ref([]);
  const currentRoutineId = ref(null);

  // Getters
  const currentRoutine = computed(() => { /* fallback + lookup */ });
  const visibleExercises = computed(() =>
    currentRoutine.value.exercises.filter(e => !e.archived)
  );
  function getExerciseById(id) { ... }
  function getRoutineById(id) { ... }

  // Mutaciones (puras, sin I/O)
  function setRoutines(data) { routines.value = data; }
  function addRoutine(routine) { routines.value.push(routine); }
  function removeRoutine(id) { ... }
  function setCurrentRoutine(id) { currentRoutineId.value = id; }
  function findExercise(exerciseId) { ... }
  function resetCurrentRoutine() { ... }

  return {
    routines, currentRoutineId,
    currentRoutine, visibleExercises, getExerciseById, getRoutineById,
    setRoutines, addRoutine, removeRoutine, setCurrentRoutine,
    findExercise, resetCurrentRoutine,
  };
});
```

```js
// ── Repository (routineRepository.js) ──
export async function create(data) {
  const db = await getDb();
  const record = { ...data, createdAt: Date.now(), updatedAt: Date.now() };
  await db.routines.add(record);
  return record.id;
}
```

### Flujo gráfico

```
[Click] → View → Composable → Service → Store (memoria)
                                        → Repository → Dexie
```

El service es el orquestador. La store muta estado. El repo persiste. Nunca al revés.

---

## Flujo completo: editar ejercicio

```js
// Service
async function updateExerciseField(exerciseId, field, value) {
  // Buscar en store y mutar
  const ex = this.store.findExercise(exerciseId);
  if (!ex) return;
  ex[field] = value;

  // Persistir
  await exerciseRepository.update(exerciseId, { [field]: value });
}
```

Notar que NO se re-escribe TODO. Solo el campo que cambió.

---

## Flujo completo: cargar datos al inicio

```js
// Service (init) — se llama desde App.vue o main.js
class RoutineService {
  async init() {
    const data = await loadAll();     // persistence.loadAll()
    if (data.length === 0) {
      // Primera ejecución: sembrar defaults
      const defaults = getDefaultRoutines();
      this.store.setRoutines(defaults.map(r => deepClone(r)));
      await saveAll(this.store.routines);
      const fresh = await loadAll();
      this.store.setRoutines(fresh);
    } else {
      this.store.setRoutines(data);
    }
  }
}

// App.vue
const routineService = new RoutineService();
await routineService.init();
```

La store recibe datos ya normalizados. No hace I/O. No tiene init propio. No tiene `_ready`.

---

## Inmutabilidad de factories

Las factories devuelven objetos planos mutables. Si necesitás inmutabilidad, usá `createExercise` cada vez que necesités un objeto nuevo:

```js
// ✅ Correcto
function duplicateExercise(ex) {
  return createExercise({
    ...stripTransients(ex),
    id: nanoid(),
  });
}

// ❌ Incorrecto: modificar el original y reusarlo
function duplicateExercise(ex) {
  ex.id = nanoid();  // muta el original, efectos secundarios
  return ex;
}
```

---

## Guía de implementación

Para migrar un dominio existente a este patrón:

1. **Identificar la entidad** (Exercise, Routine, Session, Settings)
2. **Crear factory** en `src/domain/<domain>/<Entity>.js`:
   - `createEntity(data)` — constructor con defaults
   - `stripTransients(entity)` — lo que NO se persiste
   - `resetEntity(entity)` — reset a estado inicial
3. **Crear persistence** en `src/infrastructure/services/<domain>Persistence.js`:
   - `loadAll()` — cargar desde Dexie con normalización
   - `saveAll(data)` — write-all para init y callers legacy
   - `getDefaults()` — datos de primera ejecución
4. **Limpiar store** — solo estado + getters + mutaciones puras:
   - Sin `saveToDb`, `loadFromDb`, `_doSave`, init IIFE
   - Sin `_ready`, `saveToStorage`, `loadFromStorage`
   - Agregar métodos públicos: `add`, `remove`, `setAll`, `setCurrent`, `find`
5. **Actualizar service**:
   - `init()` — carga desde persistence, seed si vacío
   - Usar factories para crear objetos
   - Llamar store.add/remove/update para mutar estado (no `store.routines.push`)
   - Llamar repository.create/update/remove para persistir
   - `saveAllToStorage()` para callers legacy que necesitan write-all
6. **Actualizar composables**:
   - NO importar store para escribir (solo para leer getters)
   - NO llamar `saveToStorage` / `loadFromDb` del store
   - Delegar al service
   - Usar `store.setCurrentRoutine(id)` en vez de `store.currentRoutineId = id`
7. **Eliminar código muerto**: `deepClone`, `sanitize*`, `resetCurrentRoutine`, defaults duplicados, alias

### Orden de migración

```
1. Exercise (factory) → ya es usado por todos lados, base del resto
2. Routine  (factory + store + service + composables)
3. Session  (factory + store + service + composables)
4. Settings (factory ya existe en settingsRepository, solo ajustar)
```

Cada paso es autónomo y testeable. No mezclar dominios en un mismo commit.

---

## Checklist para cada migración

- [ ] Domain factory creada (`create`, `stripTransients`, helpers necesarios)
- [ ] Persistence module separado del store (`loadAll`, `saveAll`, `getDefaults`)
- [ ] Store NO tiene I/O (sin `saveToDb`, `loadFromDb`, `getDb`, `_ready`, init IIFE)
- [ ] Store expone solo estado + getters + mutaciones puras
- [ ] Service tiene `init()` para carga + seed
- [ ] Service usa factories para crear objetos
- [ ] Service usa store.addRoutine/removeRoutine (no `store.routines.push`)
- [ ] Service persiste con repos (no `store.saveToStorage`)
- [ ] Service expone `saveAllToStorage()` para callers legacy
- [ ] Composable no escribe directo al store (usa métodos o service)
- [ ] View no importa store ni repo
- [ ] `deepClone`, `sanitize*`, alias eliminados si ya no se usan
- [ ] Build pasa (`pnpm run build`)

---

## Preguntas frecuentes

### ¿Por qué el store muta en vez de ser inmutable?

Porque Vue 3 con `ref` y `reactive` es reactivo sobre mutación directa. `routines.value.push(r)` actualiza el DOM automáticamente. Hacer inmutable (siempre reemplazar el array) es válido pero más verboso y no aporta beneficio en app single-user.

### ¿Por qué no un solo Service que haga todo?

Porque cada dominio tiene reglas distintas. Mezclar RoutineService con SessionService crea acoplamiento donde no existe. Si en el futuro una sesión necesita leer datos de rutina, se inyecta el servicio correspondiente.

### ¿Y si el service necesita acceder a dos stores?

Pasa. Ejemplo: `SessionService` necesita sessionStore para mutar estado y routineStore para leer la rutina actual. El service usa `useRoutineStore()` internamente. No hay conflicto — los stores son singletons de Pinia.

### ¿Tests de todo esto?

Las factories son funciones puras → fáciles de testear.
Los services llaman stores y repos → se mockean las dependencias.
Los composables llaman services → se mockea el service.
Los repos llaman Dexie → se usa `resetDb()` entre tests.

Patrón para testear services:

```js
// Mock del store
const mockStore = {
  routines: [],
  addRoutine(r) { this.routines.push(r); },
};

// Mock del repo
vi.mock('../../infrastructure/db/repositories/routineRepository.js', () => ({
  create: vi.fn(),
}));
```

### ¿Dónde va el init? ¿Y el `_ready`?

El store no tiene init ni `_ready`. El `init()` está en el service y se llama desde App.vue al arrancar:

```js
// App.vue
import { RoutineService } from './application/routines/RoutineService.js';

const routineService = new RoutineService();
await routineService.init();
```

Para código que necesita esperar a que los datos estén listos (seedData, devDump, stats), se llama `service.init()` que retorna una Promise.

### ¿Cómo conviven los servicios con el store?

Cada service obtiene el store via `useRoutineStore()` en el constructor (Pinia singleton). Si el service se necesita con un store mockeado para tests:

```js
class RoutineService {
  constructor({ routineStore } = {}) {
    this._routineStore = routineStore || useRoutineStore();
  }
}
```

En producción no se pasa nada. En tests se inyecta un store mock.

### ¿Por qué `saveAllToStorage()` en el service si el principio es no hacer write-all?

Porque los callers legacy (práctica, cloud sync) modifican ejercicios in-place y necesitan persistir todo. `saveAllToStorage()` es un escape hatch que desaparecerá cuando esos dominios se refactoricen al mismo patrón.
