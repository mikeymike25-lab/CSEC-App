<<<<<<< Updated upstream
import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView, 
  Platform,
  Image,
  StatusBar,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons'; 
import { useRouter } from 'expo-router'; 
=======
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
>>>>>>> Stashed changes

export default function LoginScreen() {
  const router = useRouter();
<<<<<<< Updated upstream
  const [passwordVisible, setPasswordVisible] = useState(false);
  
=======

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '251221632759-pskohqm9190nq399sptr9v7b6vha5gqf.apps.googleusercontent.com',
    });
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    try {
      const userCredential = await auth().signInWithEmailAndPassword(
        email,
        password
      );

      await firestore()
        .collection('accounts')
        .doc(userCredential.user.uid)
        .update({
          lastLogin: firestore.FieldValue.serverTimestamp(),
        });

      // TypeScript strict routing fix applied here
      router.replace('/home' as any);
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      
      const userInfo: any = await GoogleSignin.signIn();
      const idToken = userInfo?.data?.idToken || userInfo?.idToken;

      if (!idToken) {
        throw new Error('No ID token found');
      }

      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      const userCredential = await auth().signInWithCredential(googleCredential);

      const userDoc = await firestore()
        .collection('accounts')
        .doc(userCredential.user.uid)
        .get();

      if (!userDoc.exists) {
        await firestore()
          .collection('accounts')
          .doc(userCredential.user.uid)
          .set({
            email: userCredential.user.email || '',
            displayName: userCredential.user.displayName || 'Google User',
            role: 'standard_user',
            accountStatus: 'active',
            createdAt: firestore.FieldValue.serverTimestamp(),
            lastLogin: firestore.FieldValue.serverTimestamp(),
          });

        await firestore()
          .collection('preferences')
          .doc(userCredential.user.uid)
          .set({
            autoScanEnabled: true,
            pushNotifications: true,
            strictMode: false,
            theme: 'system_default',
          });
      } else {
        await firestore()
          .collection('accounts')
          .doc(userCredential.user.uid)
          .update({
            lastLogin: firestore.FieldValue.serverTimestamp(),
          });
      }

      // TypeScript strict routing fix applied here
      router.replace('/home' as any);
    } catch (error: any) {
      console.error(error);
      Alert.alert('Google Login Failed', error.message);
    }
  };
>>>>>>> Stashed changes

  return (
    // TouchableWithoutFeedback allows closing the keyboard by tapping the background
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9F7E8" />

        <View style={styles.innerContainer}>
<<<<<<< Updated upstream
          
         <Image 
           
            source={require('../assets/images/C-SECLOGO.png')} 
            style={styles.logoImage}
            resizeMode="contain" 
          />
          {/* Input Fields */}
          <View style={styles.inputContainer}>
            <TextInput 
              style={styles.input} 
              placeholder="Email" 
              placeholderTextColor="#A9A9A9"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <View style={styles.passwordWrapper}>
              <TextInput 
                style={styles.passwordInput} 
                placeholder="Password" 
                placeholderTextColor="#A9A9A9"
                secureTextEntry={!passwordVisible}
              />
              <TouchableOpacity 
                onPress={() => setPasswordVisible(!passwordVisible)}
                style={styles.eyeIcon}
              >
                <Ionicons 
                  name={passwordVisible ? "eye-off" : "eye"} 
                  size={22} 
                  color="#555" 
=======
          <View style={styles.headerContainer}>
            <Ionicons name="shield-checkmark" size={50} color="#2D4356" />
            <Text style={styles.logoText}>C-SEC</Text>
          </View>
          <Text style={styles.subtitle}>Secure Access Portal</Text>

          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={20}
                color="#888"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor="#A9A9A9"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#888"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
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
                  name={passwordVisible ? 'eye-off' : 'eye'}
                  size={22}
                  color="#888"
>>>>>>> Stashed changes
                />
              </TouchableOpacity>
            </View>
          </View>

<<<<<<< Updated upstream
          {/* Login Button */}
          <TouchableOpacity style={styles.loginButton} activeOpacity={0.8}>
=======
          <TouchableOpacity
            style={styles.loginButton}
            activeOpacity={0.8}
            onPress={handleLogin}
          >
>>>>>>> Stashed changes
            <Text style={styles.loginButtonText}>LOGIN</Text>
            <Ionicons
              name="arrow-forward"
              size={20}
              color="#FFF"
              style={{ marginLeft: 8 }}
            />
          </TouchableOpacity>

          {/* Sign Up Link */}
        <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account yet? </Text>
<<<<<<< Updated upstream
         <TouchableOpacity onPress={() => router.push('/signup')}> 
            <Text style={styles.signupLink}>Sign up</Text>
          </TouchableOpacity>
        </View>

          <View style={styles.divider} />

          {/* Social Icons */}
          <View style={styles.socialContainer}>
            <TouchableOpacity style={styles.socialIconBox}>
               <FontAwesome name="google" size={24} color="#cd382a" />
            </TouchableOpacity>
=======
            {/* TypeScript strict routing fix applied here */}
            <TouchableOpacity onPress={() => router.push('/register' as any)}>
              <Text style={styles.signupLink}>Sign up</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
>>>>>>> Stashed changes
          </View>

          <View style={styles.socialContainer}>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={handleGoogleLogin}
            >
              <FontAwesome name="google" size={20} color="#cd382a" />
              <Text style={styles.socialButtonText}>Continue with Google</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F7E8',
  },
  innerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
<<<<<<< Updated upstream
  
  logoImage: {
    width: 400, 
    height: 250, 
    marginBottom: 0,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#FFF',
    height: 55,
    borderRadius: 30,
    paddingHorizontal: 25,
    fontSize: 16,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  passwordWrapper: {
=======
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  logoText: {
    fontSize: 42,
    fontWeight: '900',
    color: '#2D4356',
    letterSpacing: 2,
    marginLeft: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    fontWeight: '500',
    letterSpacing: 1,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 15,
  },
  inputWrapper: {
>>>>>>> Stashed changes
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    height: 55,
<<<<<<< Updated upstream
    borderRadius: 30,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 25,
    fontSize: 16,
  },
  eyeIcon: {
    paddingRight: 20,
=======
    borderRadius: 15,
    marginBottom: 15,
    paddingHorizontal: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 10,
>>>>>>> Stashed changes
  },
  loginButton: {
    backgroundColor: '#2D4356',
    width: '100%',
    height: 55,
<<<<<<< Updated upstream
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
=======
    borderRadius: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    elevation: 3,
    shadowColor: '#2D4356',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
>>>>>>> Stashed changes
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
<<<<<<< Updated upstream
  },
  signupContainer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  signupText: {
    color: '#333',
  },
  signupLink: {
    color: '#4169E1',
    fontWeight: '600',
  },
  divider: {
    width: '80%',
    height: 1,
    backgroundColor: '#DDD',
    marginTop: 40,
    marginBottom: 30,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  socialIconBox: {
    backgroundColor: '#FFF',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
=======
    letterSpacing: 1,
  },
  signupContainer: {
    flexDirection: 'row',
    marginTop: 25,
  },
  signupText: {
    color: '#555',
    fontSize: 15,
  },
  signupLink: {
    color: '#2D4356',
    fontWeight: 'bold',
    fontSize: 15,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 35,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#DDD',
  },
  dividerText: {
    marginHorizontal: 15,
    color: '#888',
    fontWeight: '600',
  },
  socialContainer: {
    width: '100%',
  },
  socialButton: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    height: 55,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  socialButtonText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
>>>>>>> Stashed changes
  },
});