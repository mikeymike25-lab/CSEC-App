import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView, 
  Image,
  StatusBar,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons'; 
import { useRouter } from 'expo-router'; 

// --- FIREBASE IMPORTS ---
import { auth } from '../firebaseConfig'; 
import { signInWithEmailAndPassword } from 'firebase/auth';

// --- THEME CONTEXT ---
import { useTheme } from '../context/ThemeContext';

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
          
          <Image 
            source={require('../assets/images/C-SECLOGO.png')} 
            style={styles.logoImage}
            resizeMode="contain" 
          />
          
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
  errorText: { color: '#cd382a', marginBottom: 10, textAlign: 'center', fontWeight: 'bold' },
  logoImage: { width: 400, height: 200, marginBottom: 20 },
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
  // FIXED: Added signupText back to the stylesheet
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