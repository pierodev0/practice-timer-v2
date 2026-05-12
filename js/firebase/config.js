import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyCvI_IAAcpBFMRpWSJ7wt2RND9fhCgpSRw',
  authDomain: 'music-routine-app.firebaseapp.com',
  projectId: 'music-routine-app',
  storageBucket: 'music-routine-app.firebasestorage.app',
  messagingSenderId: '908433154492',
  appId: '1:908433154492:web:36c81821c5b5b7f183cbb9'
};

export const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache()
});
export const auth = getAuth(app);
