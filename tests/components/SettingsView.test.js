import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref } from 'vue';
import { mount } from '@vue/test-utils';

const state = vi.hoisted(() => ({
  user: null,
  isLoading: false,
  error: null,
}));

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  logout: vi.fn(),
  clearError: vi.fn(),
  syncNow: vi.fn(),
  push: vi.fn(),
  exportAllData: vi.fn(),
  restoreAllData: vi.fn(),
  deleteAllData: vi.fn(),
  toggleFullscreenPlay: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('../../src/composables/settings/useFirebaseAuth.js', () => ({
  useFirebaseAuth: () => ({
    user: ref(state.user),
    isLoading: ref(state.isLoading),
    error: ref(state.error),
    isLoggedIn: () => !!state.user,
    login: mocks.login,
    logout: mocks.logout,
    clearError: mocks.clearError,
  }),
}));

vi.mock('../../src/composables/settings/useCloudSync.js', () => ({
  useCloudSync: () => ({
    lastSyncTime: ref(null),
    syncNow: mocks.syncNow,
  }),
}));

vi.mock('../../src/composables/settings/useDataManager.js', () => ({
  useDataManager: () => ({
    exportAllData: mocks.exportAllData,
    restoreAllData: mocks.restoreAllData,
    deleteAllData: mocks.deleteAllData,
  }),
}));

vi.mock('../../src/composables/settings/useSettings.js', () => ({
  useSettings: () => ({
    fullscreenPlay: ref(true),
    toggleFullscreenPlay: mocks.toggleFullscreenPlay,
  }),
}));

const SettingsView = (await import('../../src/views/SettingsView.vue')).default;

function mountSettings() {
  return mount(SettingsView);
}

function buttonsWithText(wrapper, text) {
  return wrapper.findAll('button').filter(button => button.text().includes(text));
}

describe('SettingsView cloud authentication states', () => {
  beforeEach(() => {
    state.user = null;
    state.isLoading = false;
    state.error = null;
    vi.clearAllMocks();
  });

  it('shows only Google login while disconnected', () => {
    const wrapper = mountSettings();

    expect(wrapper.text()).toContain('Iniciar sesión con Google');
    expect(buttonsWithText(wrapper, 'Sincronizar ahora')).toHaveLength(0);
    expect(buttonsWithText(wrapper, 'Cerrar sesión')).toHaveLength(0);
  });

  it('shows connection status and cloud actions after login', () => {
    state.user = { email: 'test@example.com' };
    const wrapper = mountSettings();

    expect(wrapper.text()).toContain('test@example.com');
    expect(wrapper.text()).toContain('Conectado');
    expect(buttonsWithText(wrapper, 'Iniciar sesión con Google')).toHaveLength(0);
    expect(buttonsWithText(wrapper, 'Sincronizar ahora')).toHaveLength(1);
    expect(buttonsWithText(wrapper, 'Cerrar sesión')).toHaveLength(1);
  });
});
