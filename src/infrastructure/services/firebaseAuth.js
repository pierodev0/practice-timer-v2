import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { auth } from './firebaseConfig.js';

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

export function loginGoogle() {
  return signInWithPopup(auth, provider);
}

export function handleRedirectResult() {
  return getRedirectResult(auth);
}

export function logoutGoogle() {
  return signOut(auth);
}

export function observeAuth(onUserChange, onError) {
  if (onError) {
    return onAuthStateChanged(auth, onUserChange, onError);
  }
  return onAuthStateChanged(auth, onUserChange);
}

export function getAuthErrorMessage(error) {
  switch (error?.code) {
    case 'auth/unauthorized-domain':
      return `El dominio ${window.location.hostname} no está autorizado en Firebase Authentication.`;
    case 'auth/operation-not-allowed':
      return 'Google no está habilitado como proveedor en Firebase Authentication.';
    case 'auth/popup-blocked':
      return 'El navegador bloqueó la ventana de Google. Permití ventanas emergentes para este sitio.';
    case 'auth/popup-closed-by-user':
      return 'La ventana de Google se cerró antes de completar el inicio de sesión.';
    case 'auth/cancelled-popup-request':
      return 'Ya hay otro inicio de sesión de Google en curso.';
    case 'auth/network-request-failed':
      return 'No se pudo conectar con Firebase. Revisá tu conexión e intentá nuevamente.';
    default:
      return error?.message || 'No se pudo iniciar sesión con Google.';
  }
}

export { auth };
