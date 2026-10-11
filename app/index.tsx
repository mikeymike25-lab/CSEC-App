import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Keyboard,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';

// --- FIREBASE & GOOGLE IMPORTS ---
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore'; 
import { auth, db } from '../firebaseConfig';
import { Platform } from 'react-native';
import { performGoogleSignIn } from '../services/googleAuth';

// --- THEME CONTEXT ---
import { useTheme } from '../context/ThemeContext';

// --- CUSTOM ANIMATED TECH LOGO ---
const AnimatedTechLogo = ({ isDark }: { isDark: boolean }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const cursorOpacity = useRef(new Animated.Value(1)).current; 

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      })
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.delay(400),
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.delay(400)
      ])
    ).start();
    
  }, [fadeAnim, translateY, cursorOpacity]);

  return (
    <Animated.View style={[styles.animatedLogoContainer, { opacity: fadeAnim, transform: [{ translateY }] }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[styles.logoMainText, { color: isDark ? '#FFFFFF' : '#1E3246' }]}>CSEC</Text>
        <Animated.Text style={[styles.logoMainText, { color: isDark ? '#4DA8DA' : '#2D4356', opacity: cursorOpacity }]}>_</Animated.Text>
      </View>
    </Animated.View>
  );
};

export default function LoginScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  
  // --- STATE VARIABLES ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMaintenance, setIsMaintenance] = useState(false);

  // --- DYNAMIC COLORS ---
  const bgColor = isDark ? '#121A21' : '#F9F7E8';
  const inputBg = isDark ? '#1A242E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#1E3246';
  const placeholderColor = isDark ? '#606A75' : '#A9A9A9';
  const cardShadow = isDark ? '#000' : '#8A9AA9';

  // --- REAL-TIME LISTENER FOR MAINTENANCE MODE ---
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'system', 'config'), 
      (docSnap) => {
        if (docSnap.exists()) {
          setIsMaintenance(docSnap.data().maintenanceMode === true);
        }
      },
      (error) => {
        // Silently suppress the error on unauthenticated config reads
        console.warn("Config Read Blocked by Rules:", error.code);
      }
    );
    return () => unsub();
  }, []);

  // --- HELPER: CHECK DIRECTIVES ---
  const checkGlobalDirectives = async (user: any) => {
    if (isMaintenance) {
      const tokenResult = await user.getIdTokenResult();
      let isAdmin = tokenResult.claims.admin === true;
      if (!isAdmin) {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists() && userSnap.data()?.role === 'admin') {
          isAdmin = true;
        }
      }

      if (!isAdmin) {
        await auth.signOut();
        throw new Error('SYSTEM LOCKDOWN: The network is currently down for maintenance. Only Administrators can access the app at this time.');
      }
    }
  };

  // --- EMAIL LOGIN LOGIC ---
  const handleEmailLogin = async () => {
    setErrorMessage(''); 
    Keyboard.dismiss();

    if (!email || !password) {
      setErrorMessage('Please fill in both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      await checkGlobalDirectives(userCredential.user);
      router.replace('/tabs');
    } catch (e: any) { 
      if (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password') {
        setErrorMessage('Invalid email or password. Please try again.');
      } else {
        setErrorMessage(e.message); 
      }
    } finally { 
      setIsLoading(false);
    }
  };

  // --- GOOGLE OAUTH LOGIN LOGIC (CROSS-PLATFORM) ---
  const handleGoogleLogin = async () => {
    setErrorMessage('');
    setIsLoading(true);
    
    try {
      const user = await performGoogleSignIn();

      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (!userDocSnap.exists()) {
        await setDoc(userDocRef, {
          uid: user.uid,
          name: user.displayName || 'C-SEC Agent',
          email: user.email,
          createdAt: new Date(),
          tier: 'Tier 1 Analyst',
          trustScore: 100, 
          activeKeys: 0,
          role: 'agent',
          accountStatus: 'active',
          profileImage: user.photoURL || null
        });
      }

      await checkGlobalDirectives(user);
      router.replace('/tabs');
    } catch (error: any) {
      console.log("Google Login Error:", error);
      if (error.code === 'SIGN_IN_CANCELLED' || error.code === 'auth/popup-closed-by-user') {
        // User closed the pop-up, silently ignore
      } else {
        setErrorMessage('Google Authentication failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const content = (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={bgColor} />
        
        <View style={styles.innerContainer}>
          
          <AnimatedTechLogo isDark={isDark} />

          {isMaintenance && (
            <View style={styles.maintenanceBanner}>
              <Ionicons name="warning" size={20} color="#F59E0B" style={{ marginRight: 8 }} />
              <Text style={styles.maintenanceBannerText}>
                SYSTEM MAINTENANCE ACTIVE: Only Administrator logins are permitted at this time.
              </Text>
            </View>
          )}
          
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <View style={styles.inputContainer}>
            <TextInput 
              style={[styles.input, { backgroundColor: inputBg, color: textColor, shadowColor: cardShadow }]} 
              placeholder="Email" 
              placeholderTextColor={placeholderColor}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail} 
              editable={!isLoading}
            />
            
            <View style={[styles.passwordWrapper, { backgroundColor: inputBg, shadowColor: cardShadow }]}>
              <TextInput 
                style={[styles.passwordInput, { color: textColor }]} 
                placeholder="Password" 
                placeholderTextColor={placeholderColor}
                secureTextEntry={!passwordVisible}
                value={password}
                onChangeText={setPassword} 
                editable={!isLoading}
              />
              <TouchableOpacity 
                onPress={() => setPasswordVisible(!passwordVisible)}
                style={styles.eyeIcon}
              >
                <Ionicons name={passwordVisible ? "eye-off" : "eye"} size={22} color={placeholderColor} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.loginButton, isLoading && { opacity: 0.7 }]} 
            activeOpacity={0.8}
            onPress={handleEmailLogin} 
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.loginButtonText}>LOGIN</Text>
            )}
          </TouchableOpacity>

          <View style={styles.signupContainer}>
            <Text style={[styles.signupText, { color: textColor }]}>Don't have an account yet? </Text>
            <TouchableOpacity onPress={() => router.push('/signup')}> 
              <Text style={styles.signupLink}>Sign up</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.divider, { backgroundColor: isDark ? '#2D4356' : '#DDD' }]} />

          <View style={styles.socialContainer}>
            <TouchableOpacity 
              style={[styles.socialIconBox, { backgroundColor: inputBg, shadowColor: cardShadow }]} 
              onPress={handleGoogleLogin}
              disabled={isLoading}
            >
               <FontAwesome name="google" size={24} color="#cd382a" />
            </TouchableOpacity>
          </View>

        </View>
      </SafeAreaView>
  );

  if (Platform.OS === 'web') {
    return content;
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      {content}
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  innerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  
  animatedLogoContainer: { alignItems: 'center', marginBottom: 30, marginTop: 10 },
  logoMainText: { fontSize: 48, fontWeight: '900', letterSpacing: 4 },
  
  maintenanceBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: '#F59E0B', borderWidth: 1, padding: 15, borderRadius: 12, width: '100%', marginBottom: 20 },
  maintenanceBannerText: { color: '#F59E0B', fontWeight: 'bold', fontSize: 12, flex: 1, lineHeight: 18 },

  errorText: { color: '#cd382a', marginBottom: 10, textAlign: 'center', fontWeight: 'bold' },
  inputContainer: { width: '100%', marginBottom: 20 },
  input: {
    height: 55, borderRadius: 30, paddingHorizontal: 25,
    fontSize: 16, marginBottom: 15, elevation: 3,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  passwordWrapper: {
    flexDirection: 'row', alignItems: 'center',
    height: 55, borderRadius: 30, elevation: 3,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  passwordInput: { flex: 1, paddingHorizontal: 25, fontSize: 16 },
  eyeIcon: { paddingRight: 20 },
  loginButton: {
    backgroundColor: '#2D4356', width: '100%', height: 55, borderRadius: 30,
    justifyContent: 'center', alignItems: 'center', marginTop: 10,
  },
  loginButtonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  signupContainer: { flexDirection: 'row', marginTop: 20 },
  signupText: { fontSize: 14 },
  signupLink: { color: '#4169E1', fontWeight: '600' },
  divider: { width: '80%', height: 1, marginTop: 40, marginBottom: 30 },
  socialContainer: { flexDirection: 'row', justifyContent: 'center' },
  socialIconBox: {
    width: 50, height: 50, borderRadius: 25,
    justifyContent: 'center', alignItems: 'center', marginHorizontal: 10,
    elevation: 4, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4,
  },
});