/**
 * Test setup — runs before each test file.
 * Provides localStorage mock when jsdom doesn't include it.
 */
import { vi } from 'vitest';

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
