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

function isMobile() {
  return navigator.maxTouchPoints > 0 || /Mobi|Android/i.test(navigator.userAgent);
}

export async function loginGoogle() {
  if (isMobile()) {
    await signInWithRedirect(auth, provider);
    return null;
  }
  return signInWithPopup(auth, provider);
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
