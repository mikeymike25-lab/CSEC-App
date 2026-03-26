import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; 

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
export const auth = getAuth(app);