import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, Platform } from 'react-native';

// Firebase imports
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { registerActiveSession } from '../services/sessionService';

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMaintenance, setIsMaintenance] = useState(false);
  
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

  // 2. Real-time System Maintenance Listener
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'system', 'config'),
      (docSnap) => {
        if (docSnap.exists()) {
          const config = docSnap.data();
          setIsMaintenance(config?.maintenanceMode === true);
        }
      },
      (error) => {
        console.warn("[_layout] Config snapshot listener notice:", error.code);
      }
    );
    return () => unsub();
  }, []);

  // 3. Check Firebase Auth State and Admin Claims
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const tokenResult = await currentUser.getIdTokenResult();
          let userIsAdmin = tokenResult.claims.admin === true;
          if (!userIsAdmin) {
            const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
            if (userSnap.exists() && userSnap.data()?.role === 'admin') {
              userIsAdmin = true;
            }
          }
          setIsAdmin(userIsAdmin);
        } catch {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setIsFirebaseReady(true); 
    });
    return unsubscribe;
  }, []);

  // 3b. Real-time Multi-Device Active Session Registration & Remote Revocation Listener
  useEffect(() => {
    if (!user) return;

    let cleanupSession: (() => void) | null = null;
    let isMounted = true;

    registerActiveSession(user.uid, async () => {
      if (!isMounted) return;
      try {
        const message = "Your active session on this device was terminated remotely from another device.";
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.alert) {
          window.alert("SESSION REVOKED: " + message);
        } else {
          Alert.alert("Session Terminated", message, [{ text: "OK" }]);
        }
        await signOut(auth);
        router.replace('/');
      } catch (err) {
        console.error("Remote revocation signOut error:", err);
      }
    }).then((cleanup) => {
      if (isMounted) {
        cleanupSession = cleanup;
      } else {
        cleanup();
      }
    });

    return () => {
      isMounted = false;
      if (cleanupSession) {
        cleanupSession();
      }
    };
  }, [user]);

  // 4. Handle Safe Routing with Centralized Maintenance Gating
  useEffect(() => {
    // Wait until everything is ready
    if (!isFirebaseReady || !isAnimationDone) return; 

    // Once both are done, hide the native splash screen underneath
    SplashScreen.hideAsync();

    // Screens that are strictly for unauthenticated users
    const publicScreens = ['index', 'signup']; 
    
    // Safely grab the current route folder as a generic string
    const currentRouteStr: string = (segments[0] || 'index') as string; 
    const isTryingToAccessPublic = publicScreens.includes(currentRouteStr);

    // CENTRALIZED MAINTENANCE MODE GATE:
    // If maintenance mode is active and user is not an administrator, force redirect to /maintenance
    if (isMaintenance && !isAdmin) {
      if (currentRouteStr !== 'maintenance') {
        router.replace('/maintenance' as any);
      }
      return;
    }

    // If maintenance is turned off (or user is an admin) and user is on /maintenance screen, restore navigation
    if ((!isMaintenance || isAdmin) && currentRouteStr === 'maintenance') {
      if (user) {
        router.replace('/tabs');
      } else {
        router.replace('/');
      }
      return;
    }

    if (user && isTryingToAccessPublic) {
      // User is logged in but trying to view Login/Signup? Send to tabs.
      router.replace('/tabs');
    } else if (!user && !isTryingToAccessPublic && currentRouteStr !== 'maintenance') {
      // User is NOT logged in but trying to access private screens? Send to login.
      router.replace('/');
    }
  }, [user, isFirebaseReady, isAnimationDone, segments, isMaintenance, isAdmin]);

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
          <Stack.Screen name="maintenance" />
          <Stack.Screen name="tabs" />
          <Stack.Screen name="appearance" /> 
          <Stack.Screen name="security" />
          <Stack.Screen name="notification" />
          <Stack.Screen name="admin" />
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