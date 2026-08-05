import { readonly, shallowRef, ref } from 'vue';
import {
  getAuthErrorMessage,
  handleRedirectResult,
  loginGoogle,
  logoutGoogle,
  observeAuth,
} from '../../infrastructure/services/firebaseAuth.js';

const user = shallowRef(null);
const isLoading = ref(true);
const error = ref(null);
let unsubscribe = null;
let initializationPromise = null;
let onAuthUserChange = null;

function setAuthUser(nextUser, onUserChange = onAuthUserChange) {
  user.value = nextUser;
  if (onUserChange) {
    return onUserChange(nextUser);
  }
}

export function initAuth(onUserChange) {
  if (initializationPromise) return initializationPromise;
  onAuthUserChange = onUserChange;

  initializationPromise = new Promise((resolve) => {
    let authStateReady = false;
    let redirectReady = false;
    let currentUser = null;
    let initialUserApplied = false;

    const finishInitialization = () => {
      if (!authStateReady || !redirectReady || initialUserApplied) return;
      initialUserApplied = true;
      setAuthUser(currentUser, onUserChange);
      isLoading.value = false;
      resolve(currentUser);
    };

    unsubscribe = observeAuth(
      (nextUser) => {
        authStateReady = true;
        currentUser = nextUser;
        if (initialUserApplied) {
          setAuthUser(nextUser, onUserChange);
        }
        finishInitialization();
      },
      (authError) => {
        authStateReady = true;
        error.value = getAuthErrorMessage(authError);
        finishInitialization();
      },
    );

    handleRedirectResult()
      .catch((authError) => {
        error.value = getAuthErrorMessage(authError);
      })
      .finally(() => {
        redirectReady = true;
        finishInitialization();
      });
  });

  return initializationPromise;
}

export function disposeAuth() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  initializationPromise = null;
  onAuthUserChange = null;
  user.value = null;
  isLoading.value = true;
  error.value = null;
}

export function useFirebaseAuth() {
  async function login() {
    error.value = null;
    isLoading.value = true;
    try {
      const result = await loginGoogle();
      if (result?.user) {
        setAuthUser(result.user);
      }
      return result;
    } catch (authError) {
      error.value = getAuthErrorMessage(authError);
      throw authError;
    } finally {
      isLoading.value = false;
    }
  }

  async function logout() {
    error.value = null;
    try {
      await logoutGoogle();
    } catch (authError) {
      error.value = getAuthErrorMessage(authError);
      throw authError;
    }
  }

  return {
    user: readonly(user),
    isLoading: readonly(isLoading),
    error: readonly(error),
    isLoggedIn: () => !!user.value,
    login,
    logout,
    clearError: () => { error.value = null; },
  };
}

export function getCurrentUser() {
  return user.value;
}
