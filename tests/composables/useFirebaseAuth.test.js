import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getAuthErrorMessage: vi.fn((error) => error?.message || 'Auth error'),
  handleRedirectResult: vi.fn(),
  loginGoogle: vi.fn(),
  logoutGoogle: vi.fn(),
  observeAuth: vi.fn(),
}));

vi.mock('../../src/infrastructure/services/firebaseAuth.js', () => ({
  getAuthErrorMessage: mocks.getAuthErrorMessage,
  handleRedirectResult: mocks.handleRedirectResult,
  loginGoogle: mocks.loginGoogle,
  logoutGoogle: mocks.logoutGoogle,
  observeAuth: mocks.observeAuth,
}));

const {
  disposeAuth,
  getCurrentUser,
  initAuth,
  useFirebaseAuth,
} = await import('../../src/composables/settings/useFirebaseAuth.js');

describe('useFirebaseAuth', () => {
  let observerCallback;
  let observerError;

  beforeEach(() => {
    disposeAuth();
    vi.clearAllMocks();
    observerCallback = null;
    observerError = null;
    mocks.handleRedirectResult.mockResolvedValue(null);
    mocks.observeAuth.mockImplementation((onUserChange, onError) => {
      observerCallback = onUserChange;
      observerError = onError;
      return vi.fn();
    });
  });

  it('waits for Firebase observer and redirect restoration', async () => {
    const onUserChange = vi.fn();
    const user = { uid: 'user-1', email: 'test@example.com' };
    const initialization = initAuth(onUserChange);

    observerCallback(user);
    await initialization;

    expect(getCurrentUser()).toBe(user);
    expect(onUserChange).toHaveBeenCalledWith(user);
    expect(useFirebaseAuth().isLoading.value).toBe(false);
  });

  it('exposes redirect errors instead of swallowing them', async () => {
    const error = new Error('Unauthorized domain');
    mocks.handleRedirectResult.mockRejectedValue(error);
    const initialization = initAuth();

    observerCallback(null);
    await initialization;

    expect(useFirebaseAuth().error.value).toBe('Unauthorized domain');
  });

  it('exposes login errors to the reactive state', async () => {
    const error = new Error('Login failed');
    mocks.loginGoogle.mockRejectedValue(error);
    const auth = useFirebaseAuth();

    await expect(auth.login()).rejects.toBe(error);
    expect(auth.error.value).toBe('Login failed');
  });

  it('notifies the app when popup login returns a user', async () => {
    const onUserChange = vi.fn();
    const loggedInUser = { uid: 'user-2', email: 'google@example.com' };
    mocks.loginGoogle.mockResolvedValue({ user: loggedInUser });
    const initialization = initAuth(onUserChange);

    observerCallback(null);
    await initialization;
    onUserChange.mockClear();

    await useFirebaseAuth().login();

    expect(getCurrentUser()).toBe(loggedInUser);
    expect(onUserChange).toHaveBeenCalledWith(loggedInUser);
  });

  it('cleans up the observer when disposed', async () => {
    const unsubscribe = vi.fn();
    mocks.observeAuth.mockImplementationOnce((onUserChange) => {
      observerCallback = onUserChange;
      return unsubscribe;
    });
    const initialization = initAuth();

    observerCallback(null);
    await initialization;
    disposeAuth();

    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
