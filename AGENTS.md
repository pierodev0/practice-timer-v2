# AGENT.md — Music Routine App

## ⚠️ Important Rules

- **NEVER run `git commit` or `git push`.** The user handles all version control.
- Make changes to files only. The user will review and commit.
- If you created commits by mistake, notify the user so they can reset if needed.

## ⚠️ Fuente de verdad

**El código fuente real y actualizado está en `js/` (módulos ES) y `css/`.**
Usa SIEMPRE esos archivos como referencia.

## Archivos de referencia para LLM

| Leer primero | Para qué |
|---|---|
| **`DESIGN.md`** | Arquitectura completa: tipos, dependencias, flujos, algoritmos |
| **`PLAN.md`** | Arquitectura de sincronización cloud con Firebase |

## Reglas de arquitectura (sucinto)

- **state.js** es la única fuente de verdad. Las vistas importan `getState()`, `saveData()`, etc.
- **Las vistas NUNCA se importan entre sí.** La comunicación cruzada va por `state.js` o `app.js`.
- **export.js** no tiene imports de la app (preparado para SheetJS/xlsx).
- **`js/firebase/`** es una capa opcional — solo se activa con el login de Google. No rompe el funcionamiento offline.
- **`saveData()`** ahora también gatilla cloud sync (debounced 2s) si el usuario activó sincronización automática.
- **`app.js`** orquesta todo: loadData, Firebase init, auth observer, y onSnapshot listener para cambios remotos.

## Comandos

| Comando | Descripción |
|---|---|
| `pnpm run dev` | Dev server (http://localhost:5173) |
| `pnpm run build` | Build producción → `dist/` |
| `pnpm run preview` | Preview del build |
