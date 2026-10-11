import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// --- FIREBASE IMPORTS ---
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore'; 
import { auth, db } from '../firebaseConfig';

// --- THEME CONTEXT ---
import { useTheme } from '../context/ThemeContext';

// --- CUSTOM COMPONENTS ---
import PasswordStrengthMeter, { getPasswordStrength } from '../components/PasswordStrengthMeter';
import TermsModal from '../components/TermsModal';

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

export default function SignupScreen() {
  const router = useRouter(); 
  const { isDark } = useTheme();

  // --- STATE ---
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // --- GLOBAL DIRECTIVE STATE ---
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [isMaintenance, setIsMaintenance] = useState(false);

  // --- DYNAMIC COLORS ---
  const bgColor = isDark ? '#121A21' : '#F9F7E8';
  const inputBg = isDark ? '#1A242E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#1E3246';
  const placeholderColor = isDark ? '#606A75' : '#A9A9A9';
  const cardShadow = isDark ? '#000' : '#8A9AA9';
  const modalColor = isDark ? '#1A242E' : '#F9F7E8';

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'system', 'config'), 
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setRegistrationOpen(data.allowNewSignups ?? true);
          setIsMaintenance(data.maintenanceMode === true);
        }
      },
      (error) => {
        console.warn("Config Read Blocked by Rules (Signup):", error.code);
      }
    );
    return () => unsub();
  }, []);

  // --- HELPER: SHOULD FORM BE DISABLED? ---
  const isFormDisabled = isLoading || !registrationOpen || isMaintenance;

  // --- SIGNUP LOGIC ---
  const handleSignUp = async () => {
    if (isFormDisabled) return;

    let isValid = true;
    let newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
      isValid = false;
    }

    const trimmedEmail = email.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      newErrors.email = 'Please enter a valid email';
      isValid = false;
    }

    const strength = getPasswordStrength(password);
    if (!strength.isStrong) {
      newErrors.password = 'Must have 8+ chars, uppercase, lowercase & a number/symbol';
      isValid = false;
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    if (!agreeToTerms) {
      newErrors.terms = 'You must agree to the terms';
      isValid = false;
    }

    setErrors(newErrors);

    if (isValid) {
      setIsLoading(true);
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        const user = userCredential.user;

        await updateProfile(user, { displayName: name });

        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          name: name,
          email: email,
          createdAt: new Date(),
          tier: 'Tier 1 Analyst',
          trustScore: 100, 
          activeKeys: 0,
          role: 'agent',
          accountStatus: 'active' 
        });

        // Automatically send the verification email
        try {
          // Import sendEmailVerification if it's missing (it needs to be imported from 'firebase/auth')
          const { sendEmailVerification } = require('firebase/auth');
          await sendEmailVerification(user);
        } catch (emailError) {
          console.warn("Could not send verification email on signup:", emailError);
        }

        setIsLoading(false);
        router.replace('/tabs'); 
        
      } catch (error: any) {
        setIsLoading(false);
        if (error.code === 'auth/email-already-in-use') {
          setErrors({ ...newErrors, email: 'This email is already in use.' });
        } else {
          Alert.alert("Signup Failed", error.message);
        }
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={bgColor} />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()} 
          >
            <Ionicons name="arrow-back" size={28} color={isDark ? '#4DA8DA' : '#2D4356'} />
          </TouchableOpacity>

          <AnimatedTechLogo isDark={isDark} />

          {/* --- GLOBAL DIRECTIVE: DYNAMIC CLOSED BANNER --- */}
          {(isMaintenance || !registrationOpen) && (
            <View style={styles.closedBanner}>
              <Ionicons name="lock-closed" size={20} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={styles.closedBannerText}>
                {isMaintenance 
                  ? "System is under maintenance. Registration is temporarily paused." 
                  : "Registration is currently closed by the System Administrator."}
              </Text>
            </View>
          )}

          {/* Input: Name */}
          <View style={styles.inputContainer}>
            <TextInput 
              style={[
                styles.input, 
                { backgroundColor: inputBg, color: textColor, shadowColor: cardShadow },
                focusedInput === 'name' && styles.inputFocused, 
                errors.name ? styles.inputError : null,
                isFormDisabled && { opacity: 0.5 }
              ]} 
              placeholder="Name" 
              placeholderTextColor={placeholderColor}
              value={name}
              onFocus={() => setFocusedInput('name')}
              onBlur={() => setFocusedInput(null)}
              onChangeText={(text) => { setName(text); setErrors({...errors, name: ''}); }}
              editable={!isFormDisabled}
            />
            {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
          </View>

          {/* Input: Email */}
          <View style={styles.inputContainer}>
            <TextInput 
              style={[
                styles.input, 
                { backgroundColor: inputBg, color: textColor, shadowColor: cardShadow },
                focusedInput === 'email' && styles.inputFocused, 
                errors.email ? styles.inputError : null,
                isFormDisabled && { opacity: 0.5 }
              ]} 
              placeholder="Email" 
              placeholderTextColor={placeholderColor}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onFocus={() => setFocusedInput('email')}
              onBlur={() => setFocusedInput(null)}
              onChangeText={(text) => { setEmail(text); setErrors({...errors, email: ''}); }}
              editable={!isFormDisabled}
            />
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
          </View>

          {/* Input: Password */}
          <View style={styles.inputContainer}>
            <View style={[
              styles.passwordWrapper, 
              { backgroundColor: inputBg, shadowColor: cardShadow },
              focusedInput === 'password' && styles.inputFocused, 
              errors.password ? styles.inputError : null,
              isFormDisabled && { opacity: 0.5 }
            ]}>
              <TextInput 
                style={[styles.passwordInput, { color: textColor }]} 
                placeholder="Password" 
                placeholderTextColor={placeholderColor}
                secureTextEntry={!passwordVisible}
                value={password}
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)}
                onChangeText={(text) => { setPassword(text); setErrors({...errors, password: ''}); }}
                editable={!isFormDisabled}
              />
              <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)} style={styles.eyeIcon} disabled={isFormDisabled}>
                <Ionicons name={passwordVisible ? "eye-off" : "eye"} size={22} color={placeholderColor} />
              </TouchableOpacity>
            </View>
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
            <PasswordStrengthMeter password={password} />
          </View>

          {/* Input: Confirm Password */}
          <View style={styles.inputContainer}>
            <View style={[
              styles.passwordWrapper, 
              { backgroundColor: inputBg, shadowColor: cardShadow },
              focusedInput === 'confirmPassword' && styles.inputFocused, 
              errors.confirmPassword ? styles.inputError : null,
              isFormDisabled && { opacity: 0.5 }
            ]}>
              <TextInput 
                style={[styles.passwordInput, { color: textColor }]} 
                placeholder="Confirm password" 
                placeholderTextColor={placeholderColor}
                secureTextEntry={!confirmPasswordVisible} 
                value={confirmPassword}
                onFocus={() => setFocusedInput('confirmPassword')}
                onBlur={() => setFocusedInput(null)}
                onChangeText={(text) => { setConfirmPassword(text); setErrors({...errors, confirmPassword: ''}); }}
                editable={!isFormDisabled}
              />
              <TouchableOpacity onPress={() => setConfirmPasswordVisible(!confirmPasswordVisible)} style={styles.eyeIcon} disabled={isFormDisabled}>
                <Ionicons name={confirmPasswordVisible ? "eye-off" : "eye"} size={22} color={placeholderColor} />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
          </View>

          {/* Checkbox & Terms */}
          <View style={[styles.checkboxRow, isFormDisabled && { opacity: 0.5 }]}>
            <TouchableOpacity onPress={() => { setAgreeToTerms(!agreeToTerms); setErrors({...errors, terms: ''}); }} disabled={isFormDisabled}>
              <Ionicons 
                name={agreeToTerms ? "checkbox" : "square-outline"} 
                size={24} 
                color={agreeToTerms ? (isDark ? "#4DA8DA" : "#2D4356") : placeholderColor} 
              />
            </TouchableOpacity>
            <View style={styles.termsTextContainer}>
              <Text style={[styles.termsText, { color: textColor }]}>I have read and agree to the </Text>
              <TouchableOpacity onPress={() => setModalVisible(true)} disabled={isFormDisabled}>
                <Text style={styles.termsLink}>Terms and Conditions </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setModalVisible(true)} disabled={isFormDisabled}>
              <Text style={[styles.termsLink]}>and Privacy Policy</Text>
              </TouchableOpacity>
            </View>
          </View>
          {errors.terms ? <Text style={[styles.errorText, { marginBottom: 15 }]}>{errors.terms}</Text> : null}

          {/* Sign Up Button */}
          <TouchableOpacity 
            style={[styles.signupButton, isFormDisabled && { opacity: 0.5 }]} 
            activeOpacity={0.8} 
            onPress={handleSignUp}
            disabled={isFormDisabled}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.signupButtonText}>
                {isMaintenance ? "SYSTEM DOWN" : (registrationOpen ? "Sign Up" : "REGISTRATION CLOSED")}
              </Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* --- TERMS & CONDITIONS MODAL --- */}
      <TermsModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAccept={() => {
          setAgreeToTerms(true);
          setErrors({ ...errors, terms: '' });
        }}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 30, paddingTop: 60, paddingBottom: 40 },
  backButton: { position: 'absolute', top: 50, left: 20, padding: 10, zIndex: 10 },
  
  animatedLogoContainer: { alignItems: 'center', marginBottom: 30, marginTop: 10 },
  logoMainText: { 
    fontSize: 48, 
    fontWeight: '900', 
    letterSpacing: 4,
    marginTop: 70,
  },

  // --- BANNER STYLE ---
  closedBanner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(239, 68, 68, 0.1)', 
    borderColor: '#EF4444', 
    borderWidth: 1, 
    padding: 15, 
    borderRadius: 12, 
    width: '100%', 
    marginBottom: 20 
  },
  closedBannerText: { 
    color: '#EF4444', 
    fontWeight: 'bold', 
    fontSize: 12, 
    lineHeight: 18,
    flex: 1 
  },

  inputContainer: { width: '100%', marginBottom: 15 },
  input: {
    height: 55, borderRadius: 30, paddingHorizontal: 25, fontSize: 15,
    elevation: 2, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3,
    borderWidth: 1.5, borderColor: 'transparent', 
  },
  passwordWrapper: {
    flexDirection: 'row', alignItems: 'center',
    height: 55, borderRadius: 30, elevation: 2,
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3,
    borderWidth: 1.5, borderColor: 'transparent', 
  },
  passwordInput: { flex: 1, paddingHorizontal: 25, fontSize: 15 },
  eyeIcon: { paddingRight: 20 },
  inputFocused: { borderColor: '#4DA8DA' },
  inputError: { borderColor: '#cd382a' },
  errorText: { color: '#cd382a', fontSize: 12, marginTop: 5, marginLeft: 15 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 5, marginTop: 5, paddingHorizontal: 5 },
  termsTextContainer: { flexDirection: 'row', flexWrap: 'wrap', marginLeft: 10, flex: 1 },
  termsText: { fontSize: 12 },
  termsLink: { color: '#4169E1', fontSize: 12, textDecorationLine: 'underline' },
  signupButton: { backgroundColor: '#2D4356', width: '100%', height: 55, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  signupButtonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: '85%', height: '75%', borderRadius: 25, overflow: 'hidden' }, 
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  modalContent: { padding: 20 },
  modalBodyText: { fontSize: 13, lineHeight: 22, paddingBottom: 20 }, 
  modalAcceptButton: { margin: 20, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  modalAcceptButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});