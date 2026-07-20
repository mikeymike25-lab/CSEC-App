import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";
// 1. Updated Auth imports for React Native
import { 
  getAuth, 
  initializeAuth, 
  getReactNativePersistence, 
  browserLocalPersistence 
} from "firebase/auth";
// 2. Import AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStorage } from "firebase/storage";
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
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

try {
  if (Platform.OS === 'web') {
    initializeFirestore(app, { experimentalForceLongPolling: true });
  }
} catch (e) {
  // Ignore initialized error during Expo HMR reload
}

// Export services to use them in your screens
export const db = getFirestore(app);

// 3. Initialize Auth WITH AsyncStorage persistence for Mobile, and default for Web
export const auth = Platform.OS === 'web' 
  ? getAuth(app) 
  : initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });

export const storage = getStorage(app);