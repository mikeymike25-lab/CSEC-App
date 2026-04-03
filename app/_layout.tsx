import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';

// Firebase imports
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebaseConfig';

// Context & Components
import LinkInterceptor from '../components/LinkInterceptor';
import { ThemeProvider } from '../context/ThemeContext';

// 1. Tell the splash screen to stay visible until we are ready
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [isAnimationDone, setIsAnimationDone] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  
  const router = useRouter();
  const segments = useSegments();

  // 2. Check Firebase Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsFirebaseReady(true); // Firebase has finished checking
    });

    return unsubscribe;
  }, []);

  // 3. Handle Routing once BOTH Firebase and the Animation are done
  useEffect(() => {
    if (!isFirebaseReady || !isAnimationDone) return; 

    const publicScreens = ['index', 'signup']; 
    
    // Safely grab the first segment
    const currentRoute = segments[0]; 
    const isPublicScreen = !currentRoute || publicScreens.includes(currentRoute);

    if (user && isPublicScreen) {
      router.replace('/tabs');
    } else if (!user && !isPublicScreen) {
      router.replace('/');
    }

  }, [user, isFirebaseReady, isAnimationDone, segments]);

  // 4. Render the Lottie Animation First
  if (!isAnimationDone) {
    return (
      <View style={styles.animationContainer}>
        <LottieView
          autoPlay
          loop={false}
          // Make sure this path points to your actual Lottie JSON file!
          source={require('../assets/csec-animation.json')} 
          style={{ width: '100%', height: '100%' }}
          onAnimationFinish={() => {
            setIsAnimationDone(true);
            SplashScreen.hideAsync(); // Hide native background once animation finishes
          }}
        />
      </View>
    );
  }

  // Fallback just in case the animation finishes before Firebase responds
  if (!isFirebaseReady) {
    return <View style={styles.animationContainer} />;
  }

  // 5. Render the App with Theme, Navigation, and Global Interceptor
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

const styles = StyleSheet.create({
  animationContainer: {
    flex: 1,
    backgroundColor: '#F9F7E8', // Matches your app.json splash background
    alignItems: 'center',
    justifyContent: 'center',
  },
});