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
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; 
import { useRouter } from 'expo-router'; 

export default function SignupScreen() {
  const router = useRouter(); 

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
  
  // FIXED TYPESCRIPT ERROR HERE
  const [errors, setErrors] = useState<Record<string, string>>({});

  // --- VALIDATION LOGIC ---
  const handleSignUp = () => {
    let isValid = true;
    // FIXED TYPESCRIPT ERROR HERE
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
      alert("Validation Passed! Ready to create account.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
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
            <Ionicons name="arrow-back" size={28} color="#2D4356" />
          </TouchableOpacity>

          {/* Logo */}
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
                focusedInput === 'name' && styles.inputFocused, 
                errors.name ? styles.inputError : null
              ]} 
              placeholder="Name" 
              placeholderTextColor="#A9A9A9"
              value={name}
              onFocus={() => setFocusedInput('name')}
              onBlur={() => setFocusedInput(null)}
              onChangeText={(text) => { setName(text); setErrors({...errors, name: ''}); }}
            />
            {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
          </View>

          {/* Input: Email */}
          <View style={styles.inputContainer}>
            <TextInput 
              style={[
                styles.input, 
                focusedInput === 'email' && styles.inputFocused, 
                errors.email ? styles.inputError : null
              ]} 
              placeholder="Email" 
              placeholderTextColor="#A9A9A9"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onFocus={() => setFocusedInput('email')}
              onBlur={() => setFocusedInput(null)}
              onChangeText={(text) => { setEmail(text); setErrors({...errors, email: ''}); }}
            />
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
          </View>

          {/* Input: Password */}
          <View style={styles.inputContainer}>
            <View style={[
              styles.passwordWrapper, 
              focusedInput === 'password' && styles.inputFocused, 
              errors.password ? styles.inputError : null
            ]}>
              <TextInput 
                style={styles.passwordInput} 
                placeholder="Password" 
                placeholderTextColor="#A9A9A9"
                secureTextEntry={!passwordVisible}
                value={password}
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)}
                onChangeText={(text) => { setPassword(text); setErrors({...errors, password: ''}); }}
              />
              <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)} style={styles.eyeIcon}>
                <Ionicons name={passwordVisible ? "eye-off" : "eye"} size={22} color="#555" />
              </TouchableOpacity>
            </View>
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
          </View>

          {/* Input: Confirm Password */}
          <View style={styles.inputContainer}>
            <View style={[
              styles.passwordWrapper, 
              focusedInput === 'confirmPassword' && styles.inputFocused, 
              errors.confirmPassword ? styles.inputError : null
            ]}>
              <TextInput 
                style={styles.passwordInput} 
                placeholder="Confirm password" 
                placeholderTextColor="#A9A9A9"
                secureTextEntry={!confirmPasswordVisible} 
                value={confirmPassword}
                onFocus={() => setFocusedInput('confirmPassword')}
                onBlur={() => setFocusedInput(null)}
                onChangeText={(text) => { setConfirmPassword(text); setErrors({...errors, confirmPassword: ''}); }}
              />
              <TouchableOpacity onPress={() => setConfirmPasswordVisible(!confirmPasswordVisible)} style={styles.eyeIcon}>
                <Ionicons name={confirmPasswordVisible ? "eye-off" : "eye"} size={22} color="#555" />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
          </View>

          {/* Checkbox & Terms */}
          <View style={styles.checkboxRow}>
            <TouchableOpacity onPress={() => { setAgreeToTerms(!agreeToTerms); setErrors({...errors, terms: ''}); }}>
              <Ionicons 
                name={agreeToTerms ? "checkbox" : "square-outline"} 
                size={24} 
                color={agreeToTerms ? "#2D4356" : "#555"} 
              />
            </TouchableOpacity>
            <View style={styles.termsTextContainer}>
              <Text style={styles.termsText}>I have read and agree to the </Text>
              <TouchableOpacity onPress={() => setModalVisible(true)}>
                <Text style={styles.termsLink}>Terms and Conditions</Text>
              </TouchableOpacity>
              <Text style={styles.termsText}> and Privacy Policy</Text>
            </View>
          </View>
          {errors.terms ? <Text style={[styles.errorText, { marginBottom: 15 }]}>{errors.terms}</Text> : null}

          {/* Sign Up Button */}
          <TouchableOpacity style={styles.signupButton} activeOpacity={0.8} onPress={handleSignUp}>
            <Text style={styles.signupButtonText}>Sign Up</Text>
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
          <View style={styles.modalCard}>
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Terms And Conditions</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle-outline" size={28} color="#FFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <Text style={styles.modalBodyText}>
                Terms and Conditions for CSEC{'\n'}
                Last Updated: February , 0{'\n\n'}
                Acceptance of Terms:{'\n'}
                By creating an account, accessing, or using Csec (the "Service"), you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you may not use our Service.{'\n\n'}
                Description of Service:{'\n'}
                (Your App Name) provides link-scanning and threat-detection tools designed to identify potential phishing websites and malicious URLs.{'\n\n'}
                No Guarantee of Absolute Security:{'\n'}
                While our Service utilizes advanced algorithms to detect threats, no security tool is 100% accurate. We do not guarantee that every malicious link will be blocked...
              </Text>
            </ScrollView>

            <TouchableOpacity 
              style={styles.modalAcceptButton} 
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

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F7E8', 
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 80, // Increased slightly to make sure the logo clears the back arrow
    paddingBottom: 40,
  },
  backButton: {
    position: 'absolute',
    top: 50, 
    left: 20,
    padding: 10, 
    zIndex: 10, 
  },
  logoImage: {
    width: 350, 
    height: 200, 
    marginTop: 30,
   
  },
  inputContainer: {
    width: '100%',
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#FFF',
    height: 55,
    borderRadius: 30,
    paddingHorizontal: 25,
    fontSize: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderWidth: 1.5, 
    borderColor: 'transparent', 
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    height: 55,
    borderRadius: 30,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderWidth: 1.5, 
    borderColor: 'transparent', 
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 25,
    fontSize: 15,
  },
  eyeIcon: {
    paddingRight: 20,
  },
  inputFocused: {
    borderColor: '#2D4356', 
  },
  inputError: {
    borderColor: '#cd382a', 
  },
  errorText: {
    color: '#cd382a',
    fontSize: 12,
    marginTop: 5,
    marginLeft: 15,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 5,
    marginTop: 5,
    paddingHorizontal: 5,
  },
  termsTextContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginLeft: 10,
    flex: 1,
  },
  termsText: {
    color: '#333',
    fontSize: 12,
  },
  termsLink: {
    color: '#4169E1',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  signupButton: {
    backgroundColor: '#2D4356',
    width: '100%',
    height: 55,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  signupButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '85%',
    height: '70%',
    backgroundColor: '#F9F7E8',
    borderRadius: 15,
    overflow: 'hidden',
  },
  modalHeader: {
    backgroundColor: '#2D4356',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContent: {
    padding: 20,
  },
  modalBodyText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 20,
  },
  modalAcceptButton: {
    backgroundColor: '#2D4356',
    margin: 20,
    height: 45,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAcceptButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  }
});