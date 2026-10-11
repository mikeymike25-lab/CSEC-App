import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
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
import { EmailAuthProvider, deleteUser, getAuth, onAuthStateChanged, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../firebaseConfig';

// --- SESSION MANAGEMENT SERVICE ---
import { 
  DeviceSession, 
  getOrCreateSessionId, 
  registerActiveSession,
  subscribeToUserSessions, 
  revokeDeviceSession, 
  revokeAllOtherSessions 
} from '../services/sessionService';

// --- THEME CONTEXT ---
import { useTheme } from '../context/ThemeContext';

// --- CUSTOM COMPONENTS ---
import PasswordStrengthMeter, { getPasswordStrength } from '../components/PasswordStrengthMeter';
import TermsModal from '../components/TermsModal';

export default function SecurityScreen() {
  const router = useRouter();
  const { isDark } = useTheme();

  // --- STATE ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Active Sessions State
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [isRevokingAll, setIsRevokingAll] = useState(false);

  // Delete Account State
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Legal / Terms Modal State
  const [isTermsModalVisible, setIsTermsModalVisible] = useState(false);

  // --- DYNAMIC COLORS ---
  const bgColor = isDark ? '#121A21' : '#F9F7E8';
  const cardColor = isDark ? '#1A242E' : '#FFFFFF';
  const textColorPrimary = isDark ? '#FFFFFF' : '#1E3246';
  const textColorSecondary = isDark ? '#A9B4C0' : '#8A9AA9';
  const inputBgColor = isDark ? '#233240' : '#F2F0E4';
  const redAccent = '#EF4444';
  const blueAccent = '#4DA8DA';
  const greenAccent = '#10B981';

  // --- SUBSCRIBE TO ACTIVE SESSIONS (REAL-TIME) ---
  useEffect(() => {
    let unsubSessions: (() => void) | null = null;
    setIsLoadingSessions(true);

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setSessions([]);
        setIsLoadingSessions(false);
        return;
      }

      try {
        // Guarantee current device session is registered in Firestore
        await registerActiveSession(user.uid, () => {});
        
        const currId = await getOrCreateSessionId();
        setCurrentSessionId(currId);

        if (unsubSessions) unsubSessions();
        unsubSessions = subscribeToUserSessions(user.uid, currId, (activeSessions) => {
          setSessions(activeSessions);
          setIsLoadingSessions(false);
        });
      } catch (err) {
        console.warn("[security.tsx] Error initializing active sessions:", err);
        setIsLoadingSessions(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubSessions) unsubSessions();
    };
  }, []);

  // --- REMOTELY LOG OUT A SINGLE DEVICE ---
  const handleRevokeSession = (session: DeviceSession) => {
    const user = auth.currentUser;
    if (!user) return;

    const performRevoke = async () => {
      try {
        setRevokingSessionId(session.id);
        await revokeDeviceSession(user.uid, session.id);
      } catch (err) {
        console.error("Failed to revoke device session:", err);
        Alert.alert("Error", "Could not log out this device. Please try again.");
      } finally {
        setRevokingSessionId(null);
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm) {
        if (window.confirm(`Log out ${session.deviceName}? This device will be disconnected immediately.`)) {
          performRevoke();
        }
      } else {
        performRevoke();
      }
    } else {
      Alert.alert(
        "Log Out Device?",
        `Are you sure you want to remotely log out "${session.deviceName}"? It will be disconnected immediately.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Log Out", style: "destructive", onPress: performRevoke }
        ]
      );
    }
  };

  // --- LOG OUT ALL OTHER DEVICES ---
  const handleRevokeAllOtherSessions = () => {
    const user = auth.currentUser;
    if (!user || !currentSessionId) return;

    const otherSessionsCount = sessions.filter(s => !s.isCurrent).length;
    if (otherSessionsCount === 0) {
      Alert.alert("Notice", "No other active sessions detected.");
      return;
    }

    const performRevokeAll = async () => {
      try {
        setIsRevokingAll(true);
        const count = await revokeAllOtherSessions(user.uid, currentSessionId);
        Alert.alert("Success", `Successfully logged out ${count} other device${count === 1 ? '' : 's'}.`);
      } catch (err) {
        console.error("Failed to revoke other sessions:", err);
        Alert.alert("Error", "Could not log out other devices. Please try again.");
      } finally {
        setIsRevokingAll(false);
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm) {
        if (window.confirm(`Log out all other ${otherSessionsCount} device(s)? All other active sessions will be terminated.`)) {
          performRevokeAll();
        }
      } else {
        performRevokeAll();
      }
    } else {
      Alert.alert(
        "Log Out All Other Devices?",
        `Are you sure you want to log out all other ${otherSessionsCount} device(s)? Only this current device will stay logged in.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Log Out All", style: "destructive", onPress: performRevokeAll }
        ]
      );
    }
  };

  // Helper: Device Icon selector
  const getDeviceIcon = (session: DeviceSession) => {
    if (session.deviceType === 'desktop' || session.platform === 'web') {
      return <Ionicons name="laptop-outline" size={24} color={textColorPrimary} />;
    } else if (session.deviceType === 'tablet') {
      return <Ionicons name="tablet-portrait-outline" size={24} color={textColorPrimary} />;
    }
    return <Ionicons name="phone-portrait-outline" size={24} color={textColorPrimary} />;
  };

  // Helper: Format Last Active time
  const formatLastActive = (lastActive: number, isCurrent?: boolean) => {
    if (isCurrent) return "Current Device";
    if (!lastActive) return "Active recently";
    const diffMs = Date.now() - lastActive;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 2) return "Active just now";
    if (diffMins < 60) return `Active ${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Active ${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Active yesterday";
    return `Active ${diffDays}d ago`;
  };

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
    const strength = getPasswordStrength(newPassword);
    if (!strength.isStrong) {
      Alert.alert(
        "Weak Password",
        "New password must be at least 8 characters long and include an uppercase letter, lowercase letter, and a number or symbol."
      );
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

                // Step 2: Query and delete all reports submitted by this user from Firestore
                try {
                  const reportsQuery = query(collection(db, "reports"), where("uid", "==", user.uid));
                  const reportsSnap = await getDocs(reportsQuery);
                  const deleteReportPromises = reportsSnap.docs.map(docSnap => deleteDoc(docSnap.ref));
                  await Promise.all(deleteReportPromises);
                } catch (reportErr) {
                  console.warn("Could not delete user reports during account purge:", reportErr);
                }

                // Step 2b: Query and delete all session records for this user
                try {
                  const sessionsSnap = await getDocs(collection(db, "users", user.uid, "sessions"));
                  const deleteSessionPromises = sessionsSnap.docs.map(docSnap => deleteDoc(docSnap.ref));
                  await Promise.all(deleteSessionPromises);
                } catch (sessErr) {
                  console.warn("Could not delete user sessions during account purge:", sessErr);
                }

                // Step 3: Delete user profile document from Firestore Database
                await deleteDoc(doc(db, "users", user.uid));

                // Step 4: Complete purge of local AsyncStorage to prevent data remanence
                await AsyncStorage.multiRemove([
                  'csec_history',
                  'csec_notification_prefs',
                  'csec_last_broadcast',
                  'notified_report_status',
                  '@csec_active_session_id'
                ]);

                if (Platform.OS === 'android') {
                  try {
                    const { updateWidget } = require('../widget/WidgetTaskHandler');
                    updateWidget();
                  } catch (e) {}
                }

                // Step 5: Delete the actual Authentication Account
                await deleteUser(user);

                Alert.alert("Account Deleted", "Your account and all associated data have been permanently removed.");
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
              <PasswordStrengthMeter password={newPassword} />
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

          {/* --- ACTIVE SESSIONS (Real-time Multi-Device Management) --- */}
          <View style={[styles.card, { backgroundColor: cardColor }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconWrapper, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#E8F5E9' }]}>
                <MaterialCommunityIcons name="cellphone-link" size={20} color={greenAccent} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.cardTitle, { color: textColorPrimary, marginLeft: 0 }]}>
                  Active Sessions {sessions.length > 0 ? `(${sessions.length})` : ''}
                </Text>
                <Text style={[styles.cardSubtitle, { color: textColorSecondary }]}>
                  Devices currently authenticated to your account
                </Text>
              </View>
            </View>

            {isLoadingSessions ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <ActivityIndicator color={greenAccent} />
                <Text style={{ color: textColorSecondary, fontSize: 12, marginTop: 8 }}>Scanning active sessions...</Text>
              </View>
            ) : sessions.length === 0 ? (
              <View style={{ paddingVertical: 12 }}>
                <Text style={{ color: textColorSecondary, fontSize: 13 }}>No active sessions detected.</Text>
              </View>
            ) : (
              <View>
                {sessions.map((session, index) => {
                  const isCurrent = session.isCurrent;
                  const isRevoking = revokingSessionId === session.id;

                  return (
                    <View key={session.id}>
                      {index > 0 && (
                        <View style={[styles.sessionDivider, { backgroundColor: isDark ? '#2D4356' : '#F2F0E4' }]} />
                      )}
                      <View style={styles.sessionRow}>
                        <View style={[styles.sessionIconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                          {getDeviceIcon(session)}
                        </View>
                        <View style={styles.sessionDetails}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                            <Text style={[styles.sessionName, { color: textColorPrimary }]} numberOfLines={1}>
                              {session.deviceName}
                            </Text>
                            {isCurrent && (
                              <View style={[styles.currentPill, { backgroundColor: greenAccent + '20' }]}>
                                <Text style={[styles.currentPillText, { color: greenAccent }]}>THIS DEVICE</Text>
                              </View>
                            )}
                          </View>
                          <Text style={[styles.sessionLocation, { color: textColorSecondary }]} numberOfLines={1}>
                            {session.osName ? `${session.osName} • ` : ''}
                            {session.browser || 'CSEC Sentinel'} • {formatLastActive(session.lastActive, isCurrent)}
                          </Text>
                        </View>

                        {isCurrent ? (
                          <View style={[styles.activePill, { backgroundColor: greenAccent + '20' }]}>
                            <View style={[styles.pulseDot, { backgroundColor: greenAccent }]} />
                            <Text style={[styles.activePillText, { color: greenAccent }]}>ONLINE</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={[styles.revokeBtn, { borderColor: redAccent }]}
                            onPress={() => handleRevokeSession(session)}
                            disabled={isRevoking}
                            activeOpacity={0.7}
                          >
                            {isRevoking ? (
                              <ActivityIndicator size="small" color={redAccent} />
                            ) : (
                              <Text style={[styles.revokeBtnText, { color: redAccent }]}>LOG OUT</Text>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}

                {/* Log Out All Other Devices Button */}
                {sessions.filter(s => !s.isCurrent).length > 0 && (
                  <TouchableOpacity
                    style={[styles.revokeAllBtn, { borderColor: redAccent + '40', backgroundColor: redAccent + '10' }]}
                    onPress={handleRevokeAllOtherSessions}
                    disabled={isRevokingAll}
                    activeOpacity={0.7}
                  >
                    {isRevokingAll ? (
                      <ActivityIndicator size="small" color={redAccent} />
                    ) : (
                      <>
                        <Ionicons name="log-out-outline" size={16} color={redAccent} style={{ marginRight: 6 }} />
                        <Text style={[styles.revokeAllBtnText, { color: redAccent }]}>
                          LOG OUT ALL OTHER DEVICES ({sessions.filter(s => !s.isCurrent).length})
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* --- LEGAL & SAFETY POLICIES --- */}
          <View style={[styles.card, { backgroundColor: cardColor }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconWrapper, { backgroundColor: isDark ? 'rgba(77, 168, 218, 0.1)' : '#EBF5FB' }]}>
                <MaterialCommunityIcons name="shield-check-outline" size={20} color={blueAccent} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.cardTitle, { color: textColorPrimary, marginLeft: 0 }]}>
                  Legal & Safety Policies
                </Text>
                <Text style={[styles.cardSubtitle, { color: textColorSecondary }]}>
                  Terms of Service, Zero-Trust Privacy & AI Disclaimers
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.policyBtn,
                {
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                  backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                },
              ]}
              onPress={() => setIsTermsModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather name="file-text" size={16} color={blueAccent} style={{ marginRight: 10 }} />
                <Text style={[styles.policyBtnText, { color: textColorPrimary }]}>Review Terms & AI Policies</Text>
              </View>
              <Feather name="chevron-right" size={18} color={textColorSecondary} />
            </TouchableOpacity>
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

        {/* --- LEGAL & PRIVACY MODAL --- */}
        <TermsModal
          visible={isTermsModalVisible}
          onClose={() => setIsTermsModalVisible(false)}
        />

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
  sessionIconBox: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  sessionDetails: { flex: 1, marginRight: 8 },
  sessionName: { fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
  sessionLocation: { fontSize: 11 },
  sessionDivider: { height: 1, marginVertical: 12 },
  cardSubtitle: { fontSize: 11, marginTop: 2 },
  
  currentPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 6, alignSelf: 'center' },
  currentPillText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  
  pulseDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  activePill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12 },
  activePillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  
  revokeBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  revokeBtnText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  revokeAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 14, borderWidth: 1, marginTop: 16 },
  revokeAllBtnText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  dangerText: { fontSize: 14, lineHeight: 22, marginBottom: 20 },
  dangerBtn: { paddingVertical: 16, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  dangerBtnText: { fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },

  policyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  policyBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },

  modalOverlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContainer: { borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalWarningText: { fontSize: 14, lineHeight: 22, marginBottom: 25, opacity: 0.9 }
});