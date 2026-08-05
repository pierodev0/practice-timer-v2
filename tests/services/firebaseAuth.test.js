import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: { currentUser: null },
  getRedirectResult: vi.fn(),
  initializeAuth: vi.fn(),
  onAuthStateChanged: vi.fn(),
  setPersistence: vi.fn(),
  signInWithPopup: vi.fn(),
  signInWithRedirect: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class GoogleAuthProvider {
    setCustomParameters() {}
  },
  browserLocalPersistence: {},
  browserPopupRedirectResolver: {},
  getRedirectResult: mocks.getRedirectResult,
  initializeAuth: mocks.initializeAuth,
  indexedDBLocalPersistence: {},
  onAuthStateChanged: mocks.onAuthStateChanged,
  setPersistence: mocks.setPersistence,
  signInWithPopup: mocks.signInWithPopup,
  signInWithRedirect: mocks.signInWithRedirect,
  signOut: mocks.signOut,
}));

vi.mock('../../src/infrastructure/services/firebaseConfig.js', () => ({
  auth: mocks.auth,
}));

const { handleRedirectResult, loginGoogle, logoutGoogle, observeAuth } = await import('../../src/infrastructure/services/firebaseAuth.js');

describe('firebase Google authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts Google authentication with popup', async () => {
    const result = { user: { uid: 'user-1' } };
    mocks.signInWithPopup.mockResolvedValue(result);

    await expect(loginGoogle()).resolves.toEqual(result);
    expect(mocks.signInWithPopup).toHaveBeenCalledOnce();
  });

  it('preserves redirect errors for the UI', async () => {
    const error = { code: 'auth/unauthorized-domain', message: 'Domain is not authorized' };
    mocks.getRedirectResult.mockRejectedValue(error);

    await expect(handleRedirectResult()).rejects.toEqual(error);
  });

  it('delegates logout and auth observation to Firebase', async () => {
    const callback = vi.fn();
    mocks.signOut.mockResolvedValue(undefined);
    mocks.onAuthStateChanged.mockReturnValue('unsubscribe');

    await logoutGoogle();
    const unsubscribe = observeAuth(callback);

    expect(mocks.signOut).toHaveBeenCalledWith(mocks.auth);
    expect(mocks.onAuthStateChanged).toHaveBeenCalledWith(mocks.auth, callback);
    expect(unsubscribe).toBe('unsubscribe');
  });
});
