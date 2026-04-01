import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { ThemeProvider } from '../context/ThemeContext';
import { auth, db } from '../firebaseConfig';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAppReady(true);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;

    let userUnsub = () => {};
    let configUnsub = () => {};

    const monitorAccess = async () => {
      const userRef = doc(db, 'users', user.uid);

      userUnsub = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.accountStatus === 'banned' || data.accountStatus === 'suspended') {
            Alert.alert("Access Revoked", `Your account has been ${data.accountStatus}.`);
            signOut(auth);
            router.replace('/');
          }
        }
      });

      const userDoc = await getDoc(userRef);
      const isAdmin = userDoc.exists() && userDoc.data().role === 'admin';

      configUnsub = onSnapshot(doc(db, 'system', 'config'), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.maintenanceMode && !isAdmin) {
            Alert.alert("System Maintenance", "The C-SEC servers are currently undergoing maintenance. Please try again later.");
            signOut(auth);
            router.replace('/');
          }
        }
      });
    };

    monitorAccess();

    return () => {
      userUnsub();
      configUnsub();
    };
  }, [user]);

  useEffect(() => {
    if (!isAppReady) return; 

    const publicScreens = ['index', 'signup']; 
    const currentRoute = segments[0]; 
    const isPublicScreen = !currentRoute || publicScreens.includes(currentRoute);

    if (user && isPublicScreen) {
      router.replace('/tabs');
    } else if (!user && !isPublicScreen) {
      router.replace('/');
    }

    SplashScreen.hideAsync();

  }, [user, isAppReady, segments]);

  if (!isAppReady) {
    return null; 
  }

  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" /> 
        <Stack.Screen name="signup" />
        <Stack.Screen name="tabs" />
        <Stack.Screen name="appearance" /> 
      </Stack>
    </ThemeProvider>
  );
}