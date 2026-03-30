import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView, 
  Image,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; 
import { useRouter } from 'expo-router'; 

// --- FIREBASE IMPORTS ---
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig'; 

// --- THEME CONTEXT ---
import { useTheme } from '../context/ThemeContext';

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

  // --- DYNAMIC COLORS ---
  const bgColor = isDark ? '#121A21' : '#F9F7E8';
  const inputBg = isDark ? '#1A242E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#1E3246';
  const placeholderColor = isDark ? '#606A75' : '#A9A9A9';
  const cardShadow = isDark ? '#000' : '#8A9AA9';
  const modalColor = isDark ? '#1A242E' : '#F9F7E8';

  // --- LOGIC (UNTOUCHED) ---
  const handleSignUp = async () => {
    let isValid = true;
    let newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
      isValid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      newErrors.email = 'Please enter a valid email';
      isValid = false;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/;
    if (!passwordRegex.test(password)) {
      newErrors.password = 'Password needs 8+ chars, 1 uppercase, and 1 number';
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
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
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
          role: 'agent' 
        });

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

          <Image 
            source={require('../assets/images/C-SECLOGO.png')} 
            style={styles.logoImage}
            resizeMode="contain" 
          />

          {/* Input: Name */}
          <View style={styles.inputContainer}>
            <TextInput 
              style={[
                styles.input, 
                { backgroundColor: inputBg, color: textColor, shadowColor: cardShadow },
                focusedInput === 'name' && styles.inputFocused, 
                errors.name ? styles.inputError : null
              ]} 
              placeholder="Name" 
              placeholderTextColor={placeholderColor}
              value={name}
              onFocus={() => setFocusedInput('name')}
              onBlur={() => setFocusedInput(null)}
              onChangeText={(text) => { setName(text); setErrors({...errors, name: ''}); }}
              editable={!isLoading}
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
                errors.email ? styles.inputError : null
              ]} 
              placeholder="Email" 
              placeholderTextColor={placeholderColor}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onFocus={() => setFocusedInput('email')}
              onBlur={() => setFocusedInput(null)}
              onChangeText={(text) => { setEmail(text); setErrors({...errors, email: ''}); }}
              editable={!isLoading}
            />
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
          </View>

          {/* Input: Password */}
          <View style={styles.inputContainer}>
            <View style={[
              styles.passwordWrapper, 
              { backgroundColor: inputBg, shadowColor: cardShadow },
              focusedInput === 'password' && styles.inputFocused, 
              errors.password ? styles.inputError : null
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
                editable={!isLoading}
              />
              <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)} style={styles.eyeIcon}>
                <Ionicons name={passwordVisible ? "eye-off" : "eye"} size={22} color={placeholderColor} />
              </TouchableOpacity>
            </View>
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
          </View>

          {/* Input: Confirm Password */}
          <View style={styles.inputContainer}>
            <View style={[
              styles.passwordWrapper, 
              { backgroundColor: inputBg, shadowColor: cardShadow },
              focusedInput === 'confirmPassword' && styles.inputFocused, 
              errors.confirmPassword ? styles.inputError : null
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
                editable={!isLoading}
              />
              <TouchableOpacity onPress={() => setConfirmPasswordVisible(!confirmPasswordVisible)} style={styles.eyeIcon}>
                <Ionicons name={confirmPasswordVisible ? "eye-off" : "eye"} size={22} color={placeholderColor} />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
          </View>

          {/* Checkbox & Terms */}
          <View style={styles.checkboxRow}>
            <TouchableOpacity onPress={() => { setAgreeToTerms(!agreeToTerms); setErrors({...errors, terms: ''}); }} disabled={isLoading}>
              <Ionicons 
                name={agreeToTerms ? "checkbox" : "square-outline"} 
                size={24} 
                color={agreeToTerms ? (isDark ? "#4DA8DA" : "#2D4356") : placeholderColor} 
              />
            </TouchableOpacity>
            <View style={styles.termsTextContainer}>
              <Text style={[styles.termsText, { color: textColor }]}>I have read and agree to the </Text>
              <TouchableOpacity onPress={() => setModalVisible(true)} disabled={isLoading}>
                <Text style={styles.termsLink}>Terms and Conditions</Text>
              </TouchableOpacity>
              <Text style={[styles.termsText, { color: textColor }]}> and Privacy Policy</Text>
            </View>
          </View>
          {errors.terms ? <Text style={[styles.errorText, { marginBottom: 15 }]}>{errors.terms}</Text> : null}

          {/* Sign Up Button */}
          <TouchableOpacity 
            style={[styles.signupButton, isLoading && { opacity: 0.7 }]} 
            activeOpacity={0.8} 
            onPress={handleSignUp}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.signupButtonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* --- TERMS & CONDITIONS MODAL --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: modalColor }]}>
            
            <View style={[styles.modalHeader, { backgroundColor: isDark ? '#2D4356' : '#2D4356' }]}>
              <Text style={styles.modalTitle}>Terms And Conditions</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle-outline" size={28} color="#FFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <Text style={[styles.modalBodyText, { color: isDark ? '#A9B4C0' : '#333' }]}>
                Terms and Conditions for CSEC{'\n'}
                Last Updated: March 30, 2026{'\n\n'}
                Acceptance of Terms:{'\n'}
                By creating an account, you agree to be bound by these Terms and Conditions...
              </Text>
            </ScrollView>

            <TouchableOpacity 
              style={[styles.modalAcceptButton, { backgroundColor: isDark ? '#4DA8DA' : '#2D4356' }]} 
              onPress={() => { setAgreeToTerms(true); setModalVisible(false); setErrors({...errors, terms: ''}); }}
            >
              <Text style={styles.modalAcceptButtonText}>Accept</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 30, paddingTop: 60, paddingBottom: 40 },
  backButton: { position: 'absolute', top: 50, left: 20, padding: 10, zIndex: 10 },
  logoImage: { width: 350, height: 180, marginTop: 20 },
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
  modalCard: { width: '85%', height: '70%', borderRadius: 25, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  modalContent: { padding: 20 },
  modalBodyText: { fontSize: 13, lineHeight: 22 },
  modalAcceptButton: { margin: 20, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  modalAcceptButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});