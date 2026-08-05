/**
 * Test setup — runs before each test file.
 * Provides localStorage mock and fake IndexedDB for Dexie tests.
 */
import { vi } from 'vitest';

// ── Fake IndexedDB (for Dexie tests) ───────────────────

import 'fake-indexeddb/auto';

// ── localStorage mock ──────────────────────────────────

const storage = new Map();

const localStorageMock = {
  getItem: vi.fn((key) => storage.get(key) ?? null),
  setItem: vi.fn((key, value) => storage.set(key, String(value))),
  removeItem: vi.fn((key) => storage.delete(key)),
  clear: vi.fn(() => storage.clear()),
  get length() { return storage.size; },
  key: vi.fn((index) => [...storage.keys()][index] ?? null),
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

beforeEach(() => {
  storage.clear();
});
