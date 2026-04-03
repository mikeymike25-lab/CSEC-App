import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// 1. Updated Auth imports for React Native
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
// 2. Import AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyB31xKjVidGXJ3NlHQDfb_dxnte0C8jgrI", 
  authDomain: "c-sec-database.firebaseapp.com",
  projectId: "c-sec-database",
  storageBucket: "c-sec-database.firebasestorage.app",
  messagingSenderId: "251221632759",
  appId: "1:251221632759:android:13fcacabeb37fa0eedd5f2" 
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services to use them in your screens
export const db = getFirestore(app);

// 3. Initialize Auth WITH AsyncStorage persistence to prevent hanging
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const storage = getStorage(app);