# PLAN.md — Firebase Cloud Sync Integration
# Music Routine App

> Implementation roadmap for adding cloud sync using Firebase Auth + Firestore.
>
> Based on the actual codebase at commit time:
> - **Bun** package manager (not npm)
> - **Tailwind CSS v4** (via `@tailwindcss/vite`)
> - **Vite 8** bundler
> - **state.js** central store with pub/sub (`subscribe()` + `_notify()`)
> - **app.js** entry point with `window.onload` orchestrator
> - Settings view at `index.html:369-451` with Tailwind card classes
>
> Goals:
> - No backend
> - Offline-first (keep localStorage)
> - Multi-device sync
> - Realtime sync
> - Minimal refactor — extend, don't replace
> - PWA compatible

---

## 1. Core Architectural Principle

**Extend persistence, don't replace state.**

The app remains:
- Fast (loads localStorage first, renders instantly)
- Offline-capable (PWA + localStorage)
- Reactively updated (existing pub/sub)

Firestore becomes:
- **Sync layer** — keeps devices in sync
- **Backup layer** — cloud copy of durable data
- **Realtime layer** — cross-device updates via `onSnapshot`

---

## 2. What Data to Sync

### ✅ SYNC (durable user data)

| Field | Type | Why |
|---|---|---|
| `routines` | `Routine[]` | User's routines and exercises |
| `stats` | `StatsMap` | Daily practice history |
| `sessions` | `Session[]` | Completed practice logs |
| `currentRoutineId` | `string` | Which routine was active (consistency) |

### ❌ DO NOT SYNC (runtime-only)

| Field | Reason |
|---|---|
| `isExercisePlaying` | UI state, ephemeral |
| `activeExerciseId` | Timer state |
| `exerciseRemaining` | Timer state |
| `viewingExerciseId` | UI navigation |
| `pendingDetailCompletion` | Modal state |
| `globalSeconds` | Session runtime counter |
| `bpm` | Current editing value |

---

## 3. Data Flow

### Startup (`app.js`)

```
window.onload:
  1. loadData()                           // localStorage → _state
  2. initializeFirebase(app)              // NEW: init Firebase SDK
  3. setupFirebaseObserver(user => {      // NEW: onAuthStateChanged
       if (user) downloadAndMergeCloudState()
     })
  4. setupDateDefaults()
  5. setupDashboard(), setupDetails(), ...
  6. setupSortable()
  7. registerServiceWorker()
  8. updateUI()
  9. window.addEventListener('beforeunload', () => saveData())
```

### Save (`state.js`)

```
saveData():
  1. Sync exerciseRemaining → active exercise's remainingSec
  2. localStorage.setItem(STORAGE_KEY, ...)   // unchanged
  3. _notify()                                 // unchanged
  4. scheduleCloudSync()                       // NEW: debounced (2s)
```

### Cloud Sync Flow

```
saveData() called
  → localStorage written (instant)
  → _notify() → UI updates
  → setTimeout(uploadState, 2000)  // debounced
       → exportSyncState(_state)
       → setDoc(firestoreDoc, { updatedAt, data })
```

### Realtime Incoming Flow (other device)

```
onSnapshot(docRef)
  → remote data changed
  → compare updatedAt
  → if remote is newer:
      → merge into _state
      → localStorage.setItem(...)
      → _notify() → UI auto-refreshes
```

---

## 4. File Structure

```
js/
├── firebase/
│   ├── config.js        Firebase init, auth, db exports
│   ├── auth.js          loginGoogle, logoutGoogle, observeAuth
│   ├── sync.js          uploadState, downloadState, mergeState, scheduleCloudSync
│   ├── serializer.js    exportSyncState, importSyncState
│   ├── merge.js         resolveMergeConflict
│   └── device.js        getDeviceId (persistent UUID)
```

---

## 5. Implementation Phases

### Phase 1 — MVP (no architecture change)

Goal: Validate the stack safely.

Files to create:
- `js/firebase/config.js`
- `js/firebase/auth.js`
- `js/firebase/device.js`
- `js/firebase/serializer.js`

Files to modify:
- `index.html` — add Cloud Sync section to Settings view
- `js/views/settings.js` — add sync UI event handlers
- `js/app.js` — add Firebase init

**What works:**
- Google Login/Logout
- Manual "Sync Now" button (upload + download)
- Sync status display (connected as, last sync time)

### Phase 2 — Auto Sync

Files to create:
- `js/firebase/sync.js`
- `js/firebase/merge.js`

Files to modify:
- `js/state.js` — add `scheduleCloudSync()` call in `saveData()`
- `js/app.js` — add `onSnapshot` listener

**What works:**
- Debounced auto-upload (2s after save)
- Timestamp comparison
- Initial merge strategy
- Realtime listener for incoming changes

### Phase 3 — Polish

- Sync status indicators (synced/syncing/offline/error)
- Conflict UI
- Mobile redirect auth fallback
- Selective sync (settings toggle)

---

## 6. Exact Code Changes

### 6.1 `js/firebase/config.js` — Firebase Init

```js
import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache()
});
export const auth = getAuth(app);
```

### 6.2 `js/firebase/auth.js` — Google Auth + Mobile Fallback

```js
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
         signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from './config.js';

const provider = new GoogleAuthProvider();

function isMobile() {
  return navigator.maxTouchPoints > 0 || /Mobi|Android/i.test(navigator.userAgent);
}

export async function loginGoogle() {
  if (isMobile()) {
    await signInWithRedirect(auth, provider);
    // Page reloads; result handled on return
    return null;
  }
  return signInWithPopup(auth, provider);
}

export async function handleRedirectResult() {
  return getRedirectResult(auth);
}

export async function logoutGoogle() {
  return signOut(auth);
}

export function observeAuth(callback) {
  return onAuthStateChanged(auth, callback);
}
```

### 6.3 `js/firebase/device.js`

```js
const STORAGE_KEY = 'music-device-id';

export function getDeviceId() {
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
```

### 6.4 `js/firebase/serializer.js` — Includes currentRoutineId

```js
export function exportSyncState(state) {
  return {
    routines: state.routines,
    stats: state.stats,
    sessions: state.sessions,
    currentRoutineId: state.currentRoutineId
  };
}

export function importSyncState(data) {
  return {
    routines: data.routines || [],
    stats: data.stats || {},
    sessions: data.sessions || [],
    currentRoutineId: data.currentRoutineId || null
  };
}
```

### 6.5 `js/firebase/sync.js` — Sync Engine

Responsibilities:
- `uploadState()` — write to Firestore
- `downloadState()` — read from Firestore
- `scheduleCloudSync()` — debounced wrapper
- Start/stop `onSnapshot` listener
- Online/offline detection
- Retry on failure

Key detail: `onSnapshot` callback must call `_notify()` so views auto-refresh.

### 6.6 `js/firebase/merge.js` — Merge Strategy

**First-sync rule** (critical edge case):
- If local has data AND cloud has data → compare `updatedAt`, newest wins
- If only local has data → upload local (local wins)
- If only cloud has data → download cloud (cloud wins)
- If neither has data → no-op

**Last-Write-Wins** (Phase 2 default):
- Compare `updatedAt` timestamps
- Newer document replaces older entirely
- Future: merge per-routine, per-session

### 6.7 `js/state.js` — Add debounced sync (Phase 2)

Add import at top:
```js
import { scheduleCloudSync } from './firebase/sync.js';
```

Inside `saveData()`, after `localStorage.setItem(...)` and before `_notify()`:
```js
scheduleCloudSync();
```

### 6.8 `js/app.js` — Integration points

**After `loadData()`**, add:
```js
import { initializeFirebase } from './firebase/config.js';
import { observeAuth, handleRedirectResult } from './firebase/auth.js';
import { startSyncListener, stopSyncListener, downloadAndMergeState } from './firebase/sync.js';
import { getState } from './state.js';

let authUnsubscribe = null;
let syncUnsubscribe = null;
```

In `window.onload`, after loadData() and before view setup:
```js
initializeFirebase();

// Handle mobile redirect result on returning
handleRedirectResult().then(result => {
  if (result?.user) {
    downloadAndMergeState(result.user.uid);
  }
});

authUnsubscribe = observeAuth(user => {
  if (user) {
    downloadAndMergeState(user.uid);
    syncUnsubscribe = startSyncListener(user.uid, remoteData => {
      // merge remote → local state → _notify()
    });
  } else {
    if (syncUnsubscribe) { syncUnsubscribe(); syncUnsubscribe = null; }
    stopSyncListener();
  }
});
```

---

## 7. Settings UI — Cloud Sync Section

Insert **AFTER the Backup card** and **BEFORE the Danger Zone** in `index.html`.

Uses the **exact same Tailwind card pattern** as existing settings:

```html
<!-- Cloud Sync -->
<div class="card p-4" id="cloud-sync-card">
  <h3 class="text-xs uppercase text-gray-500 font-bold tracking-wider mb-3">
    <i class="fas fa-cloud mr-1"></i>Sincronización Cloud
  </h3>

  <!-- Logged out state -->
  <div id="sync-logged-out">
    <button id="sync-login-btn" class="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-left">
      <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
        <i class="fab fa-google"></i>
      </div>
      <div>
        <p class="font-medium text-gray-800 text-sm">Iniciar sesión con Google</p>
        <p class="text-xs text-gray-400">Activa la sincronización en la nube</p>
      </div>
    </button>
  </div>

  <!-- Logged in state -->
  <div id="sync-logged-in" class="hidden">
    <div class="flex items-center gap-3 mb-3 p-3 rounded-lg bg-green-50">
      <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
        <i class="fas fa-cloud"></i>
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-medium text-gray-800 text-sm truncate" id="sync-user-email">—</p>
        <p class="text-xs text-gray-400">Conectado</p>
      </div>
      <span id="sync-status-dot" class="w-2 h-2 rounded-full bg-green-500"></span>
    </div>

    <div class="text-xs text-gray-400 mb-3">
      Última sincronización: <span id="sync-last-time">nunca</span>
    </div>

    <div class="space-y-2">
      <button id="sync-now-btn" class="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-left">
        <div class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
          <i class="fas fa-sync-alt"></i>
        </div>
        <div>
          <p class="font-medium text-gray-800 text-sm">Sincronizar ahora</p>
          <p class="text-xs text-gray-400">Sube y descarga los últimos cambios</p>
        </div>
      </button>

      <label class="flex items-center gap-3 p-3 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
        <div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
          <input type="checkbox" id="sync-auto-toggle" class="w-4 h-4 accent-[#E53935]" checked>
        </div>
        <div>
          <p class="font-medium text-gray-800 text-sm">Sincronización automática</p>
          <p class="text-xs text-gray-400">Sube cambios automáticamente al guardar</p>
        </div>
      </label>

      <button id="sync-logout-btn" class="w-full flex items-center gap-3 p-3 rounded-lg bg-red-50 hover:bg-red-100 transition-colors text-left">
        <div class="w-10 h-10 rounded-full bg-red-200 flex items-center justify-center text-red-700">
          <i class="fas fa-sign-out-alt"></i>
        </div>
        <div>
          <p class="font-medium text-red-800 text-sm">Cerrar sesión</p>
          <p class="text-xs text-red-500">Desconectar sincronización cloud</p>
        </div>
      </button>
    </div>
  </div>
</div>

<!-- Sync status banner (toast-style) -->
<div id="sync-toast" class="fixed bottom-24 right-4 z-50 hidden transition-all duration-300">
  <div class="bg-gray-900 text-white text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
    <i id="sync-toast-icon" class="fas fa-check-circle text-green-400"></i>
    <span id="sync-toast-text">Sincronizado</span>
  </div>
</div>
```

---

## 8. Sync Status Indicators

| Status | Dot Color | UI State |
|---|---|---|
| Synced | `bg-green-500` | Green dot |
| Syncing | `bg-yellow-500` (with spin animation on icon) | Yellow dot + spinner |
| Offline | `bg-gray-400` | Gray dot |
| Error | `bg-red-500` | Red dot + toast message |
| Not logged in | — | Login button shown |

In `settings.js`, add event handlers:
- `document.getElementById('sync-login-btn')` → `loginGoogle()`
- `document.getElementById('sync-now-btn')` → manual sync
- `document.getElementById('sync-auto-toggle')` → toggle auto-sync
- `document.getElementById('sync-logout-btn')` → `logoutGoogle()`

---

## 9. Dependencies

```bash
bun add firebase
```

---

## 10. Environment Variables (`.env`)

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Create `.env` file in project root and add to `.gitignore`.

---

## 11. Firebase Console Setup

1. Create project: `music-routine-app`
2. Enable Authentication → Google provider
3. Create Firestore Database:
   - Mode: Production
   - Region: `southamerica-west1` or `us-central1`
4. Copy web app config → paste into `.env`

---

## 12. Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null
                          && request.auth.uid == userId;
    }
  }
}
```

---

## 13. Firestore Document Structure

**Collection:** `users/{uid}/app/state`

```json
{
  "schemaVersion": 1,
  "updatedAt": "<server timestamp>",
  "deviceId": "uuid-from-device.js",
  "data": {
    "routines": [ ... ],
    "stats": { ... },
    "sessions": [ ... ],
    "currentRoutineId": "module-1"
  }
}
```

---

## 14. Edge Cases to Handle

| Scenario | Strategy |
|---|---|
| First login (local has data, cloud empty) | Upload local → cloud |
| New device (cloud has data, local empty or sample data) | Overwrite local from cloud |
| Both have data (different timestamps) | Last write wins (compare `updatedAt`) |
| Offline edit → come online | Firestore persistence queue handles it; re-check timestamps on reconnect |
| Login after offline usage | Download cloud state, merge with local |
| Logout during pending sync | Cancel pending debounce, stop listener |
| Simultaneous edits on 2 devices | Firestore's last-write-wins + our `updatedAt` compare |
| Mobile popup blocked | Fallback to `signInWithRedirect()` |
| Corrupted cloud payload | Catch + reject, keep local state intact |

---

## 15. Testing Checklist

- [ ] Login/logout with Google
- [ ] Manual sync (upload + download)
- [ ] Auto-sync triggers on save
- [ ] Data persists on page reload
- [ ] Offline: create routine → go online → syncs
- [ ] Device A edits → Device B receives realtime update
- [ ] Login on fresh device → gets cloud data
- [ ] No runtime state leaked to cloud
- [ ] Sync status indicators update correctly
- [ ] Debounce works (2s wait before upload)
- [ ] Mobile auth fallback works
- [ ] Logout clears sync state but NOT local data

---

## 16. File Change Summary

### New Files
```
js/firebase/config.js
js/firebase/auth.js
js/firebase/sync.js
js/firebase/serializer.js
js/firebase/merge.js
js/firebase/device.js
.env
```

### Modified Files

| File | What Changes |
|---|---|
| `index.html` | Add Cloud Sync section in Settings view + sync toast |
| `js/views/settings.js` | Add event handlers for sync UI |
| `js/state.js` | Import + call `scheduleCloudSync()` in `saveData()` |
| `js/app.js` | Firebase init, auth observer, sync listener startup |
| `.gitignore` | Add `.env` |

### No Changes Needed

| File | Reason |
|---|---|
| `vite.config.js` | No config needed for Firebase SDK |
| `js/views/dashboard.js` | No direct changes; reacts via `_notify()` |
| `js/views/routines.js` | No direct changes |
| `js/views/history.js` | No direct changes |
| `js/views/stats.js` | No direct changes |
| `js/views/bottom-nav.js` | No direct changes |
| `js/views/modals.js` | No direct changes |
| `js/views/details.js` | No direct changes |
| `js/export.js` | File export is unrelated to cloud sync |
| `js/utils.js` | Pure utilities, no side effects |
| `js/worker.js` | Timer worker, unrelated |
| `js/audio.js` | Audio engine, unrelated |
| `public/sw.js` | PWA service worker, no changes needed |

---

## 17. Rollout Checklist

### Sprint 1 (MVP)

- [ ] Create Firebase project + enable Auth + Firestore
- [ ] `bun add firebase`
- [ ] Create `.env` with Firebase config
- [ ] Create `js/firebase/config.js`
- [ ] Create `js/firebase/auth.js` (with mobile fallback)
- [ ] Create `js/firebase/device.js`
- [ ] Create `js/firebase/serializer.js`
- [ ] Add Cloud Sync UI to `index.html` (settings view)
- [ ] Add event handlers to `settings.js`
- [ ] Add Firebase init + auth observer to `app.js`
- [ ] Verify: login, logout, manual sync

### Sprint 2

- [ ] Create `js/firebase/sync.js` (upload, download, debounce)
- [ ] Create `js/firebase/merge.js` (first-sync + last-write-wins)
- [ ] Integrate `scheduleCloudSync()` into `state.js:saveData()`
- [ ] Add `onSnapshot` listener in `app.js`
- [ ] Add sync status indicators
- [ ] Verify: auto-sync, realtime cross-device, offline queue

### Sprint 3 (optional)

- [ ] Sync toast notifications
- [ ] Selective sync toggles (routines vs stats)
- [ ] Conflict resolution UI (manual pick)
- [ ] Cloud snapshots / version history

---

## 18. Architecture Diagram

```
┌──────────────────────────────────────┐
│ app.js (orchestrator)                │
│                                      │
│  loadData()                          │
│  initializeFirebase()                │
│  observeAuth()                       │
│    → downloadAndMergeState()         │
│    → startSyncListener(onSnapshot)   │
│                                      │
│  setupDashboard(), setupSettings()...│
│  registerServiceWorker()             │
│  updateUI()                          │
└──────┬───────────────────────┬───────┘
       │                       │
       ▼                       ▼
┌──────────────┐     ┌──────────────────┐
│ state.js     │     │ firebase/        │
│              │     │                  │
│ saveData()   │────→│ scheduleCloud()  │
│  └→localStorage│   │  └→setDoc()      │
│  └→_notify() │     │                  │
│              │     │ onSnapshot() ───→│
│ loadData()   │     │ merge → _state   │
│  └→localStrg │     │ └→_notify()      │
│              │     │                  │
│ subscribe(fn)│     │ auth.js          │
│  └→views     │     │  └→Google login  │
└──────────────┘     └──────────────────┘
```

---

## 19. Key Insight

The existing pub/sub system is the key enabler:

```
saveData() → localStorage → _notify() → views re-render

onSnapshot() → merge → _state update → _notify() → views re-render
```

Both flows end at `_notify()`. Views never need to know whether the change was local or remote. This is what makes the architecture clean.
