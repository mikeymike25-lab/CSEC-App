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
    if (!isFirebaseReady || !isAnimationDone) return; 

    // Once both are done, hide the native splash screen underneath
    SplashScreen.hideAsync();

    // Prevent routing loops by checking if we are already in the right place
    const inAuthGroup = segments[0] === 'tabs';

    if (user && !inAuthGroup) {
      router.replace('/tabs');
    } else if (!user && inAuthGroup) {
      router.replace('/');
    }
  }, [user, isFirebaseReady, isAnimationDone, segments]);

  return (
    <ThemeProvider>
      {/* ⚠️ CRITICAL: The Stack MUST always be rendered in Expo Router */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" /> 
        <Stack.Screen name="signup" />
        <Stack.Screen name="tabs" />
        <Stack.Screen name="appearance" /> 
      </Stack>
      
      <LinkInterceptor />

      {/* 🎯 THE FIX: Render the Custom Splash Screen ON TOP of the app as an overlay */}
      {(!isAnimationDone || !isFirebaseReady) && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 999, elevation: 999 }]}>
          <AnimatedSplash />
        </View>
      )}
    </ThemeProvider>
  );
}