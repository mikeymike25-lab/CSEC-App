import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

// Firebase imports
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebaseConfig'; 

// Context & Components
import { ThemeProvider } from '../context/ThemeContext';
import LinkInterceptor from '../components/LinkInterceptor'; // <-- ADDED THIS IMPORT

// 1. Tell the splash screen to stay visible until we are ready
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  
  const router = useRouter();
  const segments = useSegments();

  // 2. Check Firebase Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAppReady(true); // Firebase has finished checking
    });

    return unsubscribe;
  }, []);

  // 3. Handle Routing and Hiding the Splash Screen
  useEffect(() => {
    if (!isAppReady) return; 

    const publicScreens = ['index', 'signup']; 
    
    // Safely grab the first segment
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

  // 4. Render the App with Theme, Navigation, and Global Interceptor
  return (
    <ThemeProvider>
      <>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" /> 
          <Stack.Screen name="signup" />
          <Stack.Screen name="tabs" />
          <Stack.Screen name="appearance" /> 
        </Stack>

        {/* The Interceptor stays mounted globally to catch links anywhere */}
        <LinkInterceptor />
      </>
    </ThemeProvider>
  );
}