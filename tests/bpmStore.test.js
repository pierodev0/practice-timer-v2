import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

let useBpmStore;

beforeEach(async () => {
  setActivePinia(createPinia());
  localStorage.clear();
  const mod = await import('../src/stores/useBpmStore.js');
  useBpmStore = mod.useBpmStore;
});

describe('useBpmStore', () => {
  it('starts at 120', () => {
    const store = useBpmStore();
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
});
