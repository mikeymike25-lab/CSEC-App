import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// --- FIREBASE IMPORTS ---
import { EmailAuthProvider, deleteUser, getAuth, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { deleteDoc, doc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

// --- THEME CONTEXT ---
import { useTheme } from '../context/ThemeContext';

export default function SecurityScreen() {
  const router = useRouter();
  const { isDark } = useTheme();

  // --- STATE ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Delete Account State
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // --- DYNAMIC COLORS ---
  const bgColor = isDark ? '#121A21' : '#F9F7E8';
  const cardColor = isDark ? '#1A242E' : '#FFFFFF';
  const textColorPrimary = isDark ? '#FFFFFF' : '#1E3246';
  const textColorSecondary = isDark ? '#A9B4C0' : '#8A9AA9';
  const inputBgColor = isDark ? '#233240' : '#F2F0E4';
  const redAccent = '#EF4444';
  const blueAccent = '#4DA8DA';
  const greenAccent = '#10B981';

  // --- 1. CHANGE PASSWORD LOGIC ---
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Notice", "Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Security Warning", "New password must be at least 6 characters long.");
      return;
    }

    setIsChangingPassword(true);
    const user = auth.currentUser;

    try {
      if (user && user.email) {
        // Step 1: Re-authenticate the user (Firebase requires recent sign-in to change passwords)
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);

        // Step 2: Update the password
        await updatePassword(user, newPassword);

        Alert.alert("Success", "Your password has been successfully updated.");
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error: any) {
      console.error("Password Update Error:", error);
      if (error.code === 'auth/invalid-credential') {
        Alert.alert("Error", "The current password you entered is incorrect.");
      } else {
        Alert.alert("Error", "Failed to update password. Please try again.");
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  // --- 2. DELETE ACCOUNT LOGIC ---
  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      Alert.alert("Notice", "You must enter your password to confirm account deletion.");
      return;
    }

    Alert.alert(
      "FINAL WARNING",
      "This action is permanent. All your data, scan history, and access will be immediately destroyed. Are you absolutely sure?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Destroy Account", 
          style: "destructive",
          onPress: async () => {
            setIsDeletingAccount(true);
            const user = auth.currentUser;
            try {
              if (user && user.email) {
                // Step 1: Re-authenticate to prove identity before deletion
                const credential = EmailAuthProvider.credential(user.email, deletePassword);
                await reauthenticateWithCredential(user, credential);

                // Step 2: Delete user document from Firestore Database
                await deleteDoc(doc(db, "users", user.uid));

                // Step 3: Delete the actual Authentication Account
                await deleteUser(user);

                Alert.alert("Account Deleted", "Your account has been permanently removed.");
                router.replace('/'); // Send back to login
              }
            } catch (error: any) {
              console.error("Delete Account Error:", error);
              setIsDeletingAccount(false);
              if (error.code === 'auth/invalid-credential') {
                Alert.alert("Verification Failed", "Incorrect password. Account deletion aborted.");
              } else {
                Alert.alert("Error", "Could not delete account. Please contact an administrator.");
              }
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bgColor }]}>
      <View style={styles.container}>
        
        {/* --- MATCHING HEADER & BACK BUTTON --- */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: cardColor }]} 
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={24} color={textColorPrimary} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: textColorPrimary }]}>Security</Text>
            <Text style={[styles.headerSubtitle, { color: textColorSecondary }]}>Manage your account credentials.</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* --- CHANGE PASSWORD CARD --- */}
          <View style={[styles.card, { backgroundColor: cardColor }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconWrapper, { backgroundColor: isDark ? 'rgba(77, 168, 218, 0.1)' : '#EBF5FB' }]}>
                <Feather name="lock" size={20} color={blueAccent} />
              </View>
              <Text style={[styles.cardTitle, { color: textColorPrimary }]}>Update Password</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textColorSecondary }]}>CURRENT PASSWORD</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBgColor, color: textColorPrimary }]}
                placeholder="Enter current password"
                placeholderTextColor={textColorSecondary}
                secureTextEntry={!showPassword}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                autoCapitalize="none"
              />
            </View>

            <View style={[styles.divider, { backgroundColor: isDark ? '#2D4356' : '#F2F0E4' }]} />

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textColorSecondary }]}>NEW PASSWORD</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBgColor, color: textColorPrimary }]}
                placeholder="Enter new password"
                placeholderTextColor={textColorSecondary}
                secureTextEntry={!showPassword}
                value={newPassword}
                onChangeText={setNewPassword}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textColorSecondary }]}>CONFIRM NEW PASSWORD</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBgColor, color: textColorPrimary }]}
                placeholder="Re-type new password"
                placeholderTextColor={textColorSecondary}
                secureTextEntry={!showPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity style={styles.showPasswordToggle} onPress={() => setShowPassword(!showPassword)}>
              <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={textColorSecondary} />
              <Text style={[styles.showPasswordText, { color: textColorSecondary }]}>
                {showPassword ? "Hide Passwords" : "Show Passwords"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.primaryBtn, { backgroundColor: blueAccent }]}
              onPress={handleChangePassword}
              disabled={isChangingPassword}
            >
              {isChangingPassword ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryBtnText}>UPDATE PASSWORD</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* --- ACTIVE SESSIONS (Visual Only) --- */}
          <View style={[styles.card, { backgroundColor: cardColor }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconWrapper, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#E8F5E9' }]}>
                <MaterialCommunityIcons name="cellphone-link" size={20} color={greenAccent} />
              </View>
              <Text style={[styles.cardTitle, { color: textColorPrimary }]}>Active Sessions</Text>
            </View>
            
            <View style={styles.sessionRow}>
              <View style={styles.sessionIconBox}>
                <Ionicons name="phone-portrait-outline" size={24} color={textColorPrimary} />
              </View>
              <View style={styles.sessionDetails}>
                <Text style={[styles.sessionName, { color: textColorPrimary }]}>This Device</Text>
                <Text style={[styles.sessionLocation, { color: textColorSecondary }]}>CSEC Sentinel Mobile App</Text>
              </View>
              <View style={[styles.activePill, { backgroundColor: greenAccent + '20' }]}>
                <Text style={[styles.activePillText, { color: greenAccent }]}>ACTIVE NOW</Text>
              </View>
            </View>
          </View>

          {/* --- DANGER ZONE (Delete Account) --- */}
          <View style={[styles.card, { backgroundColor: cardColor, borderColor: redAccent, borderWidth: 1 }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconWrapper, { backgroundColor: redAccent + '20' }]}>
                <Feather name="alert-triangle" size={20} color={redAccent} />
              </View>
              <Text style={[styles.cardTitle, { color: redAccent }]}>Danger Zone</Text>
            </View>
            <Text style={[styles.dangerText, { color: textColorSecondary }]}>
              Permanently delete your C-SEC Sentinel account and all associated data. This action cannot be reversed.
            </Text>
            <TouchableOpacity 
              style={[styles.dangerBtn, { backgroundColor: redAccent + '15' }]}
              onPress={() => setIsDeleteModalVisible(true)}
            >
              <Text style={[styles.dangerBtnText, { color: redAccent }]}>DELETE ACCOUNT</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>

        {/* --- DELETE CONFIRMATION MODAL --- */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={isDeleteModalVisible}
          onRequestClose={() => !isDeletingAccount && setIsDeleteModalVisible(false)}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={styles.modalOverlayBottom}
          >
            <View style={[styles.modalContainer, { backgroundColor: cardColor }]}>
              
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: redAccent }]}>Confirm Deletion</Text>
                <TouchableOpacity onPress={() => !isDeletingAccount && setIsDeleteModalVisible(false)}>
                  <Feather name="x" size={24} color={textColorSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.modalWarningText, { color: textColorPrimary }]}>
                To verify your identity, please enter your current password to permanently destroy this account.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: textColorSecondary }]}>PASSWORD</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBgColor, color: textColorPrimary }]}
                  placeholder="Enter password"
                  placeholderTextColor={textColorSecondary}
                  secureTextEntry={true}
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity 
                style={[styles.primaryBtn, { backgroundColor: redAccent, marginBottom: 30 }]}
                onPress={handleDeleteAccount}
                disabled={isDeletingAccount}
              >
                {isDeletingAccount ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>PERMANENTLY DELETE</Text>
                )}
              </TouchableOpacity>

            </View>
          </KeyboardAvoidingView>
        </Modal>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 40, marginBottom: 20 },
  backButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 3 },
  headerTitle: { fontSize: 28, fontWeight: '800' },
  headerSubtitle: { fontSize: 14, marginTop: 2 },
  
  scrollContent: { paddingHorizontal: 24, paddingBottom: 50 },
  
  card: { borderRadius: 24, padding: 24, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  iconWrapper: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 12, letterSpacing: 0.5 },
  
  inputGroup: { marginBottom: 15 },
  inputLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  input: { height: 55, borderRadius: 16, paddingHorizontal: 20, fontSize: 16, fontWeight: '500' },
  
  divider: { height: 1, marginVertical: 20 },
  
  showPasswordToggle: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginBottom: 20, marginTop: 5 },
  showPasswordText: { fontSize: 12, fontWeight: '700', marginLeft: 6 },
  
  primaryBtn: { width: '100%', paddingVertical: 18, borderRadius: 25, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 4 },
  primaryBtnText: { color: '#FFF', fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },

  sessionRow: { flexDirection: 'row', alignItems: 'center' },
  sessionIconBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(150,150,150,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  sessionDetails: { flex: 1 },
  sessionName: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  sessionLocation: { fontSize: 12 },
  activePill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  activePillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  dangerText: { fontSize: 14, lineHeight: 22, marginBottom: 20 },
  dangerBtn: { paddingVertical: 16, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  dangerBtnText: { fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },

  modalOverlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContainer: { borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalWarningText: { fontSize: 14, lineHeight: 22, marginBottom: 25, opacity: 0.9 }
});