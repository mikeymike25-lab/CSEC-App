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
  Alert
} from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons'; 
import { useRouter } from 'expo-router'; 

// --- 1. FIREBASE IMPORTS ---
import { auth } from '../firebaseConfig'; 
import { signInWithEmailAndPassword } from 'firebase/auth';

// 🛑 COMMENTED OUT TO PREVENT EXPO GO CRASH 🛑
// import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
// import { GoogleSignin } from '@react-native-google-signin/google-signin';

export default function LoginScreen() {
  const router = useRouter();
  
  // --- 2. STATE VARIABLES ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 🛑 COMMENTED OUT TO PREVENT EXPO GO CRASH 🛑
  // useEffect(() => {
  //   GoogleSignin.configure({
  //     webClientId: '251221632759-pskohqm9190nq399sptr9v7b6vha5gqf.apps.googleusercontent.com', 
  //   });
  // }, []);

  // --- 3. EMAIL LOGIN LOGIC & VALIDATION ---
  const handleEmailLogin = async () => {
    setErrorMessage(''); 
    Keyboard.dismiss();

    // Validation 1: Empty Fields
    if (!email || !password) {
      setErrorMessage('Please fill in both email and password.');
      return;
    }

    // Validation 2: Proper Email Format
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
      setErrorMessage('Please enter a valid email address format.');
      return;
    }

    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      
      Alert.alert("Success!", "Logged in successfully.");
      router.replace('/tabs');
      
    } catch (e) { 
      // ✅ BULLETPROOF FIX: Safely cast the error to bypass strict TypeScript rules
      const error = e as any; 
      
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
        setErrorMessage('Invalid email or password. Please try again.');
      } else {
        setErrorMessage(error.message); 
      }
    } finally { 
      // ✅ FIXED: Removed the extra '{'
      setIsLoading(false);
    }
  };

  // --- 4. TEMPORARY GOOGLE LOGIN LOGIC ---
  const handleGoogleLogin = () => {
    Alert.alert(
      "Feature Disabled", 
      "Google Sign-In requires a custom Android build. Please use Email/Password to test the app in Expo Go."
    );
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9F7E8" />
        
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
              style={styles.input} 
              placeholder="Email" 
              placeholderTextColor="#A9A9A9"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail} 
            />
            
            <View style={styles.passwordWrapper}>
              <TextInput 
                style={styles.passwordInput} 
                placeholder="Password" 
                placeholderTextColor="#A9A9A9"
                secureTextEntry={!passwordVisible}
                value={password}
                onChangeText={setPassword} 
              />
              <TouchableOpacity 
                onPress={() => setPasswordVisible(!passwordVisible)}
                style={styles.eyeIcon}
              >
                <Ionicons 
                  name={passwordVisible ? "eye-off" : "eye"} 
                  size={22} 
                  color="#555" 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Button */}
          <TouchableOpacity 
            style={styles.loginButton} 
            activeOpacity={0.8}
            onPress={handleEmailLogin} 
            disabled={isLoading}
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? "LOGGING IN..." : "LOGIN"}
            </Text>
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account yet? </Text>
            <TouchableOpacity onPress={() => router.push('/signup')}> 
              <Text style={styles.signupLink}>Sign up</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Social Icons */}
          <View style={styles.socialContainer}>
            <TouchableOpacity style={styles.socialIconBox} onPress={handleGoogleLogin}>
               <FontAwesome name="google" size={24} color="#cd382a" />
            </TouchableOpacity>
          </View>

        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F7E8' },
  innerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  errorText: { color: 'red', marginBottom: 10, textAlign: 'center', fontWeight: 'bold' },
  logoImage: { width: 400, height: 250, marginBottom: 0 },
  inputContainer: { width: '100%', marginBottom: 20 },
  input: {
    backgroundColor: '#FFF', height: 55, borderRadius: 30, paddingHorizontal: 25,
    fontSize: 16, marginBottom: 15, elevation: 3, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  passwordWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    height: 55, borderRadius: 30, elevation: 3, shadowColor: '#000',
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
  signupText: { color: '#333' },
  signupLink: { color: '#4169E1', fontWeight: '600' },
  divider: { width: '80%', height: 1, backgroundColor: '#DDD', marginTop: 40, marginBottom: 30 },
  socialContainer: { flexDirection: 'row', justifyContent: 'center' },
  socialIconBox: {
    backgroundColor: '#FFF', width: 50, height: 50, borderRadius: 25,
    justifyContent: 'center', alignItems: 'center', marginHorizontal: 10,
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4,
  },
});