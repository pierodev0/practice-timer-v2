import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

// Mock settingsRepository — returns undefined by default (no saved BPM → default 120)
vi.mock('../src/db/repositories/settingsRepository.js', () => ({
  get: vi.fn(() => Promise.resolve(undefined)),
  set: vi.fn(() => Promise.resolve()),
}));

let useBpmStore;

beforeEach(async () => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
  const mod = await import('../src/stores/useBpmStore.js');
  useBpmStore = mod.useBpmStore;
});

describe('useBpmStore', () => {
  it('starts at 120', async () => {
    const store = useBpmStore();
    await store._ready;
    expect(store.bpm).toBe(120);
  });

  it('setBpm updates bpm', () => {
    const store = useBpmStore();
    store.setBpm(140);
    expect(store.bpm).toBe(140);
  });

  it('setBpm clamps to min 1', () => {
    const store = useBpmStore();
    store.setBpm(0);
    expect(store.bpm).toBe(1);
  });

  it('setBpm clamps to max 300', () => {
    const store = useBpmStore();
    store.setBpm(999);
    expect(store.bpm).toBe(300);
  });

  it('adjustBpm adds delta', () => {
    const store = useBpmStore();
    store.adjustBpm(10);
    expect(store.bpm).toBe(130);
  });

  it('adjustBpm subtracts', () => {
    const store = useBpmStore();
    store.adjustBpm(-20);
    expect(store.bpm).toBe(100);
  });

  it('loads saved BPM from settingsRepository', async () => {
    // Override mock to return a saved value
    const { get } = await import('../src/db/repositories/settingsRepository.js');
    get.mockResolvedValue(160);

    // Need a fresh store to trigger re-load with new mock
    const freshStore = useBpmStore();
    await freshStore._ready;
    expect(freshStore.bpm).toBe(160);
  });

  it('saveToStorage persists via settingsRepository', async () => {
    const store = useBpmStore();
    await store._ready;

    store.setBpm(180);
    await store.saveToStorage();

    const { set } = await import('../src/db/repositories/settingsRepository.js');
    expect(set).toHaveBeenCalledWith('bpm', 180);
  });
});
