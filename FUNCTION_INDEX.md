# Function Index — Monolith → Modular Migration Map

> Usa este archivo para que un LLM (o cualquier developer) encuentre rápidamente
> dónde fue a parar cada función del monolito original.
>
> 📄 El monolito original completo está en **`legacy/index.html`** (1145 líneas).
> 📄 El Service Worker original está en **`legacy/sw.js`**.
>
> Flujo de debug recomendado:
> 1. Busca la función problemática en `legacy/index.html`
> 2. Consulta este índice para saber a qué módulo nuevo migró
> 3. Lee el archivo nuevo y corrige

## Formato
```
Función Original → Archivo Nuevo : Nombre Nuevo (si cambió)
```

---

## 📦 Utilidades — `js/utils.js`

| Función Original | Función Nueva | Descripción |
|---|---|---|
| `formatTime(s)` | `formatTime(s)` | Segundos → MM:SS |
| `getFirstUrl(text)` | `getFirstUrl(text)` | Extrae primera URL de un texto |
| `getFirstImage(text)` | `getFirstImage(text)` | Extrae primera imagen de un texto |
| `stringToColor(str)` | `stringToColor(str)` | String → color hex para charts |
| `downloadJSON(c, n)` | `downloadJSON(content, filename)` | Descarga archivo JSON |
| `sanitizeImportedRoutine(r)` | `sanitizeImportedRoutine(r)` | Normaliza rutina importada |
| *(nueva)* | `todayStr()` | Devuelve fecha hoy YYYY-MM-DD |
| *(nueva)* | `deepClone(obj)` | Clon profundo vía JSON |

---

## 🧠 Estado Global — `js/state.js`

| Función Original | Función Nueva | Descripción |
|---|---|---|
| `state` (objeto global) | `getState()` → objeto interno `_state` | Store central |
| `STORAGE_KEY` | `STORAGE_KEY` (const interna) | Clave de localStorage |
| `saveData()` | `saveData()` | Persiste estado + notifica subscribers |
| `loadData()` | `loadData()` | Carga desde localStorage |
| `getCurrentRoutine()` | `getCurrentRoutine()` | Getter con fallback |
| `getExerciseById(id)` | `getExerciseById(id)` | Busca ejercicio por ID |
| `recordProgressSeconds(s)` | `recordProgressSeconds(seconds)` | Acumula tiempo practicado |
| `resetRoutineLogic()` | `resetRoutine()` | Resetea rutina completa |
| *(nueva)* | `subscribe(fn)` | Pub/sub para reactividad |
| *(nueva)* | `setBpm(val)` | Set BPM con clamp |
| *(nueva)* | `adjustBpm(delta)` | Ajusta BPM relativo |
| *(nueva)* | `getVisibleExercises()` | Ejercicios no archivados |

---

## 🔊 Audio — `js/audio.js`

| Función Original | Función Nueva | Descripción |
|---|---|---|
| `initAudio()` | `initAudio()` | Inicia Tone.js, crea sintetizadores |
| `playBellSound()` | `playBellSound()` | Sonido de finalización |
| `startMetronomeAudio()` | `startMetronome(bpm)` | Inicia metrónomo |
| `stopMetronomeAudio()` | `stopMetronome()` | Detiene metrónomo |
| *(nueva)* | `setMetronomeBpm(bpm)` | Cambia BPM sin reiniciar |
| *(nueva)* | `setAudioOn(val)` | Sincroniza estado isAudioOn |
| `metroSynth`, `bellSynth`, `beat` | Variables internas del módulo | No exportadas |

---

## ⏱️ Web Worker — `js/worker.js`

| Función Original | Función Nueva | Descripción |
|---|---|---|
| Blob inline (`workerCode`) | Archivo real `js/worker.js` | Timer de 1 segundo |
| `worker.onmessage` | `worker.onmessage` | Recibe 'tick' cada segundo |
| Mensajes: 'start'/'stop' | Igual | Control del intervalo |

---

## 📋 Dashboard (Vista Principal) — `js/views/dashboard.js`

| Función Original | Función Nueva | Descripción |
|---|---|---|
| `window.onload` | Movido a `js/app.js` | Inicialización |
| `updateUI()` | `updateUI()` | Actualiza toda la UI del dashboard |
| `renderExercises()` | `renderExercises()` | Renderiza lista de ejercicios |
| `toggleGlobalAudioOnly()` | `toggleGlobalAudioOnly()` | Play/Pause audio global |
| `adjustGlobalBPM(val)` | `adjustGlobalBPM(delta)` | Ajusta BPM global |
| `toggleListExercise(id)` | `toggleListExercise(id)` | Play/Pause desde lista |
| `playExercise(id)` | `playExercise(id)` | Inicia reproducción |
| `pauseSequence()` | `pauseSequence()` | Pausa ejercicio activo |
| `handleExerciseCompletion()` | `handleExerciseCompletion()` | Maneja fin de ejercicio |
| `finalizeCompletion(playSound)` | `finalizeCompletion(playSound)` | Avanza repetición o completa |
| `finishAndResetRoutine()` | `finishRoutine()` | Finaliza rutina |
| `resetRoutine()` | `resetRoutine()` (wrapper) | Resetea todo |
| *(nueva)* | `setWorker(worker)` | Recibe referencia del Worker |

---

## 🔍 Detalles (Vista de Edición) — `js/views/details.js`

| Función Original | Función Nueva | Descripción |
|---|---|---|
| `openDetailsView(id)` | `openDetailsView(id)` | Abre vista detalle |
| `closeDetailsView()` | `closeDetailsView()` | Cierra vista detalle |
| `toggleDetailPlay()` | `toggleDetailPlay()` | Play/Pause desde detalle |
| `updateExerciseTitle(v)` | `updateExerciseTitle(newTitle)` | Actualiza título |
| `updateDetailStatName(v)` | `updateDetailStatName(newVal)` | Actualiza nombre estadística |
| `adjustDetailBPM(v)` | `adjustDetailBPM(delta)` | Ajusta BPM |
| `adjustDetailReps(v)` | `adjustDetailReps(delta)` | Ajusta repeticiones |
| `adjustDetailTime(type, val)` | `adjustDetailTime(type, val)` | Ajusta duración |
| `updateDetailAutoStart(c)` | `updateDetailAutoStart(checked)` | Actualiza auto-start |
| `updateComment(v)` | `updateComment(text)` | Actualiza comentario |
| `resetCurrentDetailExercise()` | `resetCurrentDetailExercise()` | Resetea desde detalle |
| `completeDetailExercise()` | `completeDetailExercise()` | Completa desde detalle |
| `forceFinishDetail()` | `forceFinishDetail()` | Forzar finalización |
| `duplicateExercise()` | `duplicateExercise()` | Duplica ejercicio |
| `archiveExercise()` | `archiveExercise()` | Archiva ejercicio |
| `deleteDetailExercise()` | `deleteDetailExercise()` | Elimina ejercicio |
| `toggleDetailsMenu(e)` | `toggleDetailsMenu(e)` | Menú desplegable |
| `renderCommentAttachments(t)` | `renderCommentAttachments(text)` | Renderiza adjuntos |

---

## 📱 Sidebar — `js/views/sidebar.js`

| Función Original | Función Nueva | Descripción |
|---|---|---|
| `toggleSidebar(s)` | `toggleSidebar(show)` | Abre/cierra sidebar |
| `renderSidebarRoutines()` | `renderSidebarRoutines()` | Renderiza lista de rutinas |
| `switchRoutine(id)` | `switchRoutine(id)` | Cambia de rutina |
| `showAddRoutineInput()` | `showAddRoutineInput()` | Crea nueva rutina |
| `renameRoutine(id)` | `renameRoutine(id)` | Renombra rutina |
| `deleteRoutine(id)` | `deleteRoutine(id)` | Elimina rutina |
| `exportSingleRoutine(id)` | `exportSingleRoutine(id)` | Exporta una rutina |
| `exportRoutines()` | `exportAllRoutines()` | Backup completo |
| `triggerSmartImport()` | `triggerSmartImport()` | Import smart |
| `importSmartRoutines(input)` | `importSmartRoutines(input)` | Procesa import smart |
| `triggerFullRestore()` | `triggerFullRestore()` | Restaurar backup |
| `restoreAllRoutines(input)` | `restoreAllRoutines(input)` | Procesa restauración |
| `showArchivedCount()` | `showArchivedCount()` | Muestra archivados |

---

## 📊 Estadísticas — `js/views/stats.js`

| Función Original | Función Nueva | Descripción |
|---|---|---|
| `openStatsView()` | `openStatsView()` | Abre vista de stats |
| `closeStatsView()` | `closeStatsView()` | Cierra vista de stats |
| `renderStats()` | `renderStats()` | Renderiza gráficas |
| `openEditStatsModal()` | Movido a `modals.js` | Modal editar logs |
| `editStatValue(rId, eId, i)` | Movido a `modals.js` | Editar valor |
| `deleteStatLog(rId, eId, i)` | Movido a `modals.js` | Eliminar log |

---

## 🪟 Modales — `js/views/modals.js`

| Función Original | Función Nueva | Descripción |
|---|---|---|
| `toggleModal(s)` | `toggleCreateModal(show)` | Abre/cierra modal crear |
| `addNewExercise()` | `addNewExercise()` | Crea ejercicio |
| `adjustNewBPM(v)` | `adjustNewBPM(delta)` | Ajusta BPM en modal |
| `adjustNewReps(v)` | `adjustNewReps(delta)` | Ajusta reps en modal |
| `adjustNewTime(type, val)` | `adjustNewTime(type, val)` | Ajusta tiempo en modal |
| `submitStatInput()` | `submitStatInput()` | Guarda estadística |
| `skipStatInput()` | `skipStatInput()` | Salta estadística |
| `openImageModal(url)` | `openImageModal(url)` | Lightbox imagen |
| `closeImageModal()` | `closeImageModal()` | Cierra lightbox |
| *(nueva)* | `showStatModal(title, onSave, onSkip)` | Modal con callbacks |
| `openEditStatsModal()` | `openEditStatsModal()` | Modal editar logs |

---

## 🎯 Entry Point — `js/app.js`

| Función Original | Función Nueva | Descripción |
|---|---|---|
| `window.onload` | `window.onload` | Init: loadData, setupSortable, etc. |
| `navigator.serviceWorker.register` | `registerServiceWorker()` | Registro PWA |
| `new Sortable(...)` | `setupSortable()` | Drag & drop |
| `window.addEventListener('beforeunload', ...)` | En `window.onload` | Guardar al salir |
| *(nueva)* | `setupDateDefaults()` | Fechas default para filtros |

---

## 🔍 Cómo usar esto con un LLM

Cuando algo falle, pega esto en tu prompt:

> "Tengo una app de práctica musical refactorizada de un monolito a módulos.
> Consulta `FUNCTION_INDEX.md` para ver dónde está cada función.
> El problema es: [describe el bug].
> Archivos disponibles en `/js/` y `/js/views/`."

El LLM podrá:

1. Buscar en `FUNCTION_INDEX.md` qué función original está fallando
2. Saber exactamente en qué archivo y con qué nombre encontrarla
3. Leer el archivo correcto y entender el contexto

---

## 📐 Bonus: Prompt para LLM cuando algo falla

```
Eres un debugger de esta app de práctica musical.

Arquitectura:
- /js/utils.js → funciones puras
- /js/state.js → estado global + persistencia
- /js/audio.js → Tone.js metrónomo
- /js/worker.js → Web Worker timer
- /js/views/dashboard.js → lista ejercicios, playback
- /js/views/details.js → edición detalle
- /js/views/sidebar.js → sidebar, rutinas
- /js/views/stats.js → gráficas
- /js/views/modals.js → modales
- /js/app.js → entry point

Usa FUNCTION_INDEX.md para mapear funciones viejas a nuevas.

El bug: [descripción]
```
