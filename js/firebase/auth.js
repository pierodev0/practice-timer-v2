import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from './config.js';

const provider = new GoogleAuthProvider();

export async function loginGoogle() {
  try {
    return await signInWithPopup(auth, provider);
  } catch (err) {
    if (err.code === 'auth/popup-blocked') {
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw err;
  }
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
