import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';

// Firebase imports
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebaseConfig';

// Context & Components
import LinkInterceptor from '../components/LinkInterceptor';
import { ThemeProvider } from '../context/ThemeContext';
import AnimatedSplash from '../components/AnimatedSplash';

// Keep native splash screen hidden behind our custom one
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [isAnimationDone, setIsAnimationDone] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  
  const router = useRouter();
  const segments = useSegments();

  // 1. The Official 3-Second Timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimationDone(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // 2. Check Firebase Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsFirebaseReady(true); 
    });
    return unsubscribe;
  }, []);

  // 3. Handle Safe Routing
  useEffect(() => {
    // Wait until everything is ready
    if (!isFirebaseReady || !isAnimationDone) return; 

    // Once both are done, hide the native splash screen underneath
    SplashScreen.hideAsync();

    // --- THE FIX: Define screens that are ONLY for logged-out users ---
    const publicScreens = ['index', 'signup']; 
    
    // Safely grab the current route folder
    const currentRoute = segments[0] || 'index'; 
    const isTryingToAccessPublic = publicScreens.includes(currentRoute);

    if (user && isTryingToAccessPublic) {
      // User is logged in but trying to view Login/Signup? Send to tabs.
      router.replace('/tabs');
    } else if (!user && !isTryingToAccessPublic) {
      // User is NOT logged in but trying to access tabs/appearance? Send to login.
      router.replace('/');
    }
    // Notice: If user is logged in and goes to 'appearance', it completely ignores this 
    // block and lets them pass!

  }, [user, isFirebaseReady, isAnimationDone, segments]);

  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" /> 
        <Stack.Screen name="signup" />
        <Stack.Screen name="tabs" />
        <Stack.Screen name="appearance" /> 
      </Stack>
      
      <LinkInterceptor />

      {(!isAnimationDone || !isFirebaseReady) && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 999, elevation: 999, backgroundColor: '#F9F7E8' }]}>
          <AnimatedSplash />
        </View>
      )}
    </ThemeProvider>
  );
}