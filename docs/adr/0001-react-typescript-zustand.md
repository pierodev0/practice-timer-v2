# React + TypeScript + Zustand stack for the port

The Vue 3 codebase carries its riskiest logic untyped (exercise modes, timer policies, sync payloads). We port the shell to React with strict TypeScript plus zod in `domain/`, Zustand one store per domain, and keep `HashRouter` for the existing PWA-friendly hash routes.

## Considered Options

- Stay on Vue and refactor in place: rejected, the port decision predates this and targets long-term team direction.
- Redux Toolkit / React Query: rejected, `SyncEngine` already owns sync and extra state layers add indirection without a consumer.
