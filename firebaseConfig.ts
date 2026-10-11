import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, initializeFirestore, Firestore } from "firebase/firestore";
// 1. Updated Auth imports for React Native
import { 
  getAuth, 
  initializeAuth, 
  Auth 
} from "firebase/auth";
// @ts-ignore - getReactNativePersistence is provided by React Native bundle of firebase/auth
import { getReactNativePersistence } from "firebase/auth";
// 2. Import AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStorage, FirebaseStorage } from "firebase/storage";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyB31xKjVidGXJ3NlHQDfb_dxnte0C8jgrI", 
  authDomain: "c-sec-database.firebaseapp.com",
  projectId: "c-sec-database",
  storageBucket: "c-sec-database.firebasestorage.app",
  messagingSenderId: "251221632759",
  appId: "1:251221632759:android:13fcacabeb37fa0eedd5f2" 
};

// Initialize Firebase (HMR Safe)
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

try {
  if (Platform.OS === 'web') {
    initializeFirestore(app, { experimentalForceLongPolling: true });
  }
} catch (e) {
  // Ignore initialized error during Expo HMR reload
}

// Export services to use them in your screens
export const db: Firestore = getFirestore(app);

// 3. Initialize Auth WITH AsyncStorage persistence for Mobile, and default for Web
let auth: Auth;
try {
  auth = Platform.OS === 'web' 
    ? getAuth(app) 
    : initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
      });
} catch (error) {
  auth = getAuth(app);
}
export { auth };

export const storage: FirebaseStorage = getStorage(app);
