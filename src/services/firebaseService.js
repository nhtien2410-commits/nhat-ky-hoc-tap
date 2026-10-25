/**
 * Firebase Service for Daily Study Tracker
 * Handles Google Authentication and Firestore Cloud Synchronization
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as fbSignOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  update, 
  remove, 
  onValue, 
  off 
} from 'firebase/database';

const STORAGE_KEY_FIREBASE_CONFIG = 'daily_study_firebase_custom_config';

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBpq2sK850JzQQId0Xr_Z0O6Wu3Kv9yAp4",
  authDomain: "nhatky-a602e.firebaseapp.com",
  databaseURL: "https://nhatky-a602e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "nhatky-a602e",
  storageBucket: "nhatky-a602e.firebasestorage.app",
  messagingSenderId: "583049711940",
  appId: "1:583049711940:web:3175828bd811f9348e0711"
};

/**
 * Get active Firebase configuration from env, localStorage or default project
 */
export function getFirebaseConfig() {
  // 1. Check localStorage custom config first
  try {
    const saved = localStorage.getItem(STORAGE_KEY_FIREBASE_CONFIG);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.apiKey && (parsed.projectId || parsed.databaseURL)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading saved Firebase config', e);
  }

  // 2. Fallback to Vite environment variables
  const envConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || DEFAULT_FIREBASE_CONFIG.databaseURL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  if (envConfig.apiKey && (envConfig.projectId || envConfig.databaseURL)) {
    return envConfig;
  }

  // 3. Fallback to default user project
  return DEFAULT_FIREBASE_CONFIG;
}

/**
 * Save custom Firebase config from UI modal
 */
export function saveCustomFirebaseConfig(config) {
  try {
    if (!config) {
      localStorage.removeItem(STORAGE_KEY_FIREBASE_CONFIG);
    } else {
      localStorage.setItem(STORAGE_KEY_FIREBASE_CONFIG, JSON.stringify(config));
    }
    // Re-initialize app
    window.location.reload();
  } catch (e) {
    console.error('Failed to save Firebase config', e);
  }
}

let app = null;
let auth = null;
let db = null;
let rtdb = null;
let googleProvider = null;

const initialConfig = getFirebaseConfig();
if (initialConfig) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(initialConfig);
    auth = getAuth(app);
    try {
      db = getFirestore(app);
    } catch (e) {
      console.warn('Firestore initialization notice:', e);
    }
    try {
      rtdb = getDatabase(app);
    } catch (e) {
      console.warn('Realtime Database initialization notice:', e);
    }
    googleProvider = new GoogleAuthProvider();
  } catch (err) {
    console.warn('Failed to initialize Firebase with provided config:', err);
  }
}

export const isFirebaseConfigured = () => !!app && !!auth && (!!rtdb || !!db);
export const getFirestoreDb = () => db;
export const getRealtimeDb = () => rtdb;

const STORAGE_KEY_USER_PROFILE = 'daily_study_user_custom_profile';
const STORAGE_KEY_DEMO_USER = 'daily_study_demo_user_session';

/**
 * Get locally saved profile settings (accentColor, custom displayName)
 */
export function getSavedUserProfile(uid) {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_USER_PROFILE}_${uid}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading saved user profile', e);
  }
  return { accentColor: '#10b981' };
}

/**
 * Save user profile settings (accentColor, displayName, avatar)
 */
export function saveUserProfile(uid, profileData) {
  try {
    const current = getSavedUserProfile(uid);
    const updated = { ...current, ...profileData };
    localStorage.setItem(`${STORAGE_KEY_USER_PROFILE}_${uid}`, JSON.stringify(updated));
    
    // Dispatch auth update
    window.dispatchEvent(new CustomEvent('app_profile_updated', { detail: updated }));
    return updated;
  } catch (e) {
    console.error('Failed to save user profile', e);
  }
}

/**
 * Google Sign In
 */
export async function signInWithGoogle() {
  if (!isFirebaseConfigured()) {
    throw new Error('Chưa cấu hình Firebase. Bạn có thể dùng tính năng "Đăng nhập thử nghiệm Demo" hoặc cấu hình Firebase trong cài đặt đám mây.');
  }
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  const customProfile = getSavedUserProfile(user.uid);
  return {
    ...user,
    accentColor: customProfile.accentColor || '#10b981'
  };
}

/**
 * Sign in as a Demo User (instant collaborative testing without cloud setup)
 */
export function signInAsDemoUser(demoUser) {
  const customProfile = getSavedUserProfile(demoUser.uid);
  const session = {
    ...demoUser,
    accentColor: customProfile.accentColor || demoUser.accentColor || '#10b981'
  };
  localStorage.setItem(STORAGE_KEY_DEMO_USER, JSON.stringify(session));
  window.dispatchEvent(new CustomEvent('app_auth_changed', { detail: session }));
  return session;
}

/**
 * Sign Out
 */
export async function signOutUser() {
  localStorage.removeItem(STORAGE_KEY_DEMO_USER);
  if (auth) {
    await fbSignOut(auth);
  }
  window.dispatchEvent(new CustomEvent('app_auth_changed', { detail: null }));
}

/**
 * Subscribe to Auth State Changes
 */
export function onAuthChange(callback) {
  const getEnrichedUser = (rawUser) => {
    if (!rawUser) return null;
    const custom = getSavedUserProfile(rawUser.uid);
    return {
      uid: rawUser.uid,
      displayName: custom.displayName || rawUser.displayName || 'Người dùng',
      email: rawUser.email || '',
      photoURL: custom.photoURL || rawUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${rawUser.uid}`,
      accentColor: custom.accentColor || '#10b981',
      isDemo: Boolean(rawUser.isDemo)
    };
  };

  // Check saved demo user session first
  const savedDemo = localStorage.getItem(STORAGE_KEY_DEMO_USER);
  if (savedDemo) {
    try {
      const parsed = JSON.parse(savedDemo);
      callback(getEnrichedUser(parsed));
    } catch (e) {
      // ignore
    }
  }

  // Listen to custom local auth / profile changes
  const handleCustomAuth = (e) => {
    callback(getEnrichedUser(e.detail));
  };
  const handleProfileUpdated = (e) => {
    const saved = localStorage.getItem(STORAGE_KEY_DEMO_USER);
    if (saved) {
      try {
        const u = JSON.parse(saved);
        callback(getEnrichedUser({ ...u, ...e.detail }));
      } catch (err) {}
    } else if (auth && auth.currentUser) {
      callback(getEnrichedUser(auth.currentUser));
    }
  };

  window.addEventListener('app_auth_changed', handleCustomAuth);
  window.addEventListener('app_profile_updated', handleProfileUpdated);

  let unsubscribeFb = () => {};
  if (auth) {
    unsubscribeFb = onAuthStateChanged(auth, (user) => {
      if (user) {
        callback(getEnrichedUser(user));
      } else {
        const demo = localStorage.getItem(STORAGE_KEY_DEMO_USER);
        if (demo) {
          try {
            callback(getEnrichedUser(JSON.parse(demo)));
          } catch (e) {
            callback(null);
          }
        } else {
          callback(null);
        }
      }
    });
  }

  return () => {
    window.removeEventListener('app_auth_changed', handleCustomAuth);
    window.removeEventListener('app_profile_updated', handleProfileUpdated);
    unsubscribeFb();
  };
}

/**
 * Fetch study records from Cloud (RTDB or Firestore)
 */
export async function fetchRemoteStudyData(userId) {
  if (!userId) return null;
  if (rtdb) {
    try {
      const snap = await get(ref(rtdb, `users/${userId}/studyTracker/data`));
      if (snap.exists()) {
        const val = snap.val();
        return val.records || {};
      }
      return {};
    } catch (e) {
      console.warn('RTDB study data fetch note:', e);
    }
  }
  if (db) {
    try {
      const docRef = doc(db, 'users', userId, 'studyTracker', 'data');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data().records || {};
      }
      return {};
    } catch (e) {
      console.warn('Firestore study data fetch note:', e);
    }
  }
  return null;
}

/**
 * Save study records to Cloud (RTDB or Firestore)
 */
export async function saveRemoteStudyData(userId, records) {
  if (!userId) return;
  if (rtdb) {
    try {
      await set(ref(rtdb, `users/${userId}/studyTracker/data`), {
        records,
        updatedAt: new Date().toISOString()
      });
      return;
    } catch (e) {
      console.warn('RTDB study data save error:', e);
    }
  }
  if (db) {
    try {
      const docRef = doc(db, 'users', userId, 'studyTracker', 'data');
      await setDoc(docRef, {
        records,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn('Firestore study data save error:', e);
    }
  }
}

/**
 * Real-time listener for remote changes
 */
export function subscribeToRemoteData(userId, onRemoteUpdate) {
  if (!userId) return () => {};
  if (rtdb) {
    const dataRef = ref(rtdb, `users/${userId}/studyTracker/data`);
    const listener = onValue(dataRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data && data.records) {
          onRemoteUpdate(data.records);
        }
      }
    }, (err) => {
      console.warn('RTDB study listener note:', err);
    });
    return () => off(dataRef, 'value', listener);
  }
  if (db) {
    const docRef = doc(db, 'users', userId, 'studyTracker', 'data');
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data.records) {
          onRemoteUpdate(data.records);
        }
      }
    }, (err) => {
      console.warn('Firestore snapshot listener error:', err);
    });
  }
  return () => {};
}
