# AGENT.md — Music Routine App

## ⚠️ Important Rules

- **NEVER run `git commit` or `git push`.** The user handles all version control.
- Make changes to files only. The user will review and commit.
- If you created commits by mistake, notify the user so they can reset if needed.

## ⚠️ Fuente de verdad

**El código fuente real y actualizado está en `js/` (módulos ES) y `css/`.**
Usa SIEMPRE esos archivos como referencia. Recurre a `legacy/` ÚNICAMENTE
para contrastar comportamiento cuando algo no funcione como esperas.

## Archivos de referencia para LLM

| Leer primero | Para qué |
|---|---|
| **`DESIGN.md`** | Arquitectura completa: tipos, dependencias, flujos, algoritmos |
| **`FUNCTION_INDEX.md`** | Mapeo old → new (debug cuando algo no coincida) |

## Reglas de arquitectura (sucinto)

- **state.js** es la única fuente de verdad. Las vistas importan `getState()`, `saveData()`, etc.
- **Las vistas NUNCA se importan entre sí.** La comunicación cruzada va por `state.js` o `app.js`.
- **export.js** no tiene imports de la app (preparado para SheetJS/xlsx).
- **sidebar.js** existe pero **no se usa** en la UI actual (reemplazado por `routines.js` + `settings.js`).

## Comandos

| Comando | Descripción |
|---|---|
| `bun run dev` | Dev server (http://localhost:5173) |
| `bun run build` | Build producción → `dist/` |
| `bun run preview` | Preview del build |
