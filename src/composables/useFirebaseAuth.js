/**
 * useFirebaseAuth — composable wrapping js/firebase/auth.js
 * Provides reactive auth state for Vue components.
 */

import { ref, onMounted, onUnmounted, readonly } from 'vue';
import { loginGoogle, logoutGoogle, observeAuth, handleRedirectResult } from '../../js/firebase/auth.js';

const user = ref(null);
let unsub = null;

/**
 * Initialize auth observer (call once from App.vue).
 * Returns a cleanup function.
 */
export function initAuth(onUserChange) {
  unsub = observeAuth((u) => {
    user.value = u;
    if (onUserChange) onUserChange(u);
  });

  // Handle redirect result (mobile fallback)
  handleRedirectResult().then((result) => {
    if (result?.user) {
      user.value = result.user;
    }
  });

  return () => {
    if (unsub) unsub();
  };
}

export function useFirebaseAuth() {
  return {
    user: readonly(user),
    isLoggedIn: () => !!user.value,
    login: async () => { await loginGoogle(); },
    logout: async () => { await logoutGoogle(); },
  };
}

/**
 * Get the current user synchronously (for non-reactive contexts).
 */
export function getCurrentUser() {
  return user.value;
}
