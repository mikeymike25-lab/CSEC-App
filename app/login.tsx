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

// --- FIREBASE IMPORTS ---
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebaseConfig';

// --- THEME CONTEXT ---
import { useTheme } from '../context/ThemeContext';

// --- CUSTOM ANIMATED TECH LOGO ---
const AnimatedTechLogo = ({ isDark }: { isDark: boolean }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const cursorOpacity = useRef(new Animated.Value(1)).current; // <-- NEW: Hardware animated cursor

  useEffect(() => {
    // 1. Smooth fade-in and slide-up boot sequence
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

    // 2. Hardware-Accelerated Terminal Blink
    Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0,
          duration: 100, // Quick fade out
          useNativeDriver: true,
        }),
        Animated.delay(400), // Pause
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 100, // Quick fade in
          useNativeDriver: true,
        }),
        Animated.delay(400) // Pause
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

  // --- DYNAMIC COLORS ---
  const bgColor = isDark ? '#121A21' : '#F9F7E8';
  const inputBg = isDark ? '#1A242E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#1E3246';
  const placeholderColor = isDark ? '#606A75' : '#A9A9A9';
  const cardShadow = isDark ? '#000' : '#8A9AA9';

  // --- LOGIN LOGIC ---
  const handleEmailLogin = async () => {
    setErrorMessage(''); 
    Keyboard.dismiss();

    if (!email || !password) {
      setErrorMessage('Please fill in both email and password.');
      return;
    }

    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
      setErrorMessage('Please enter a valid email address format.');
      return;
    }

    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace('/tabs');
    } catch (e) { 
      const error = e as any; 
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setErrorMessage('Invalid email or password. Please try again.');
      } else {
        setErrorMessage(error.message); 
      }
    } finally { 
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    Alert.alert(
      "Feature Disabled", 
      "Google Sign-In requires a custom Android build. Please use Email/Password to test in Expo Go."
    );
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={bgColor} />
        
        <View style={styles.innerContainer}>
          
          {/* REPLACED STATIC IMAGE WITH ANIMATED TECH LOGO */}
          <AnimatedTechLogo isDark={isDark} />
          
          {/* Error Message Display */}
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          {/* Input Fields */}
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
                <Ionicons 
                  name={passwordVisible ? "eye-off" : "eye"} 
                  size={22} 
                  color={placeholderColor} 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Button */}
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

          {/* Sign Up Link */}
          <View style={styles.signupContainer}>
            <Text style={[styles.signupText, { color: textColor }]}>Don't have an account yet? </Text>
            <TouchableOpacity onPress={() => router.push('/signup')}> 
              <Text style={styles.signupLink}>Sign up</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.divider, { backgroundColor: isDark ? '#2D4356' : '#DDD' }]} />

          {/* Social Icons */}
          <View style={styles.socialContainer}>
            <TouchableOpacity 
              style={[styles.socialIconBox, { backgroundColor: inputBg, shadowColor: cardShadow }]} 
              onPress={handleGoogleLogin}
            >
               <FontAwesome name="google" size={24} color="#cd382a" />
            </TouchableOpacity>
          </View>

        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  innerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  
  // --- NEW LOGO STYLES ---
  animatedLogoContainer: { alignItems: 'center', marginBottom: 50, marginTop: 10 },
  logoMainText: { fontSize: 48, fontWeight: '900', letterSpacing: 4 },
  
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