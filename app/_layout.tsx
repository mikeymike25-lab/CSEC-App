import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';

// Firebase imports
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebaseConfig';

// Context & Components
import LinkInterceptor from '../components/LinkInterceptor';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import AnimatedSplash from '../components/AnimatedSplash';

// Keep native splash screen hidden behind our custom one
SplashScreen.preventAutoHideAsync();

import { ThemeProvider as NavThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';

function RootLayoutInner() {
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [isAnimationDone, setIsAnimationDone] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  
  const router = useRouter();
  const segments = useSegments();
  
  const { isReduceMotion, isDark } = useTheme();

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
  }, [user, isFirebaseReady, isAnimationDone, segments]);

  const navTheme = isDark 
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: '#121A21' } } 
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: '#F9F7E8' } };

  return (
    <NavThemeProvider value={navTheme}>
      <View style={{ flex: 1, backgroundColor: isDark ? '#121A21' : '#F9F7E8' }}>
        <Stack screenOptions={{ 
          headerShown: false,
          animation: isReduceMotion ? 'none' : 'fade',
          contentStyle: { backgroundColor: isDark ? '#121A21' : '#F9F7E8' }
        }}>
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
      </View>
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutInner />
    </ThemeProvider>
  );
}