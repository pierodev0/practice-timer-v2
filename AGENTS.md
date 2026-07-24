# AGENT.md — Music Routine App

## Comandos

| Comando | Descripción |
|---|---|
| `pnpm run dev` | Dev server (http://localhost:5173) |
| `pnpm run build` | Build producción → `dist/` |
| `pnpm run preview` | Preview del build |

## Arquitectura

### Separación de responsabilidades

- **Views** — presentación pura. Cero imports a stores, cero lógica de negocio. Solo reciben datos y llaman acciones desde composables.
- **Composables** — orquestan stores, manejan navegación (`useRouter`), contienen toda la lógica de negocio y flujo de la app. Cada vista tiene su propio composable específico cuando la lógica es particular (ej: `useExercisePlay` para ExercisePlayView).
- **Stores** — estado puro con persistencia (Pinia + Dexie). Sin lógica de navegación ni orquestación.
- **db/** — schema Dexie y acceso a datos. Las stores consumen db/entities. Las versiones de schema se incrementan al agregar tablas.

<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->
