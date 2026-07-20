import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl
} from 'react-native';

// --- NEW: IMPORTS FOR NOTIFICATIONS AND MEMORY ---
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

import { getAuth, sendEmailVerification, signOut, updateProfile } from 'firebase/auth';
import { addDoc, collection, doc, onSnapshot, setDoc, updateDoc, query, where } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';

// --- THEME CONTEXT ---
import { useTheme } from '../../context/ThemeContext';

const DEFAULT_AVATAR = require('../../assets/images/Profile/PlaceHolder.jpg'); 

export default function ProfileScreen() {
  const router = useRouter();
  const { isDark } = useTheme();

  // --- STATE ---
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);
  const [accountId, setAccountId] = useState('Connecting...');
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isVerificationSending, setIsVerificationSending] = useState(false);
  const [isVerifiedModalVisible, setIsVerifiedModalVisible] = useState(false); 
  
  // Verification Send Modal
  const [isVerifyLinkModalVisible, setIsVerifyLinkModalVisible] = useState(false);
  const [verifyLinkModalTitle, setVerifyLinkModalTitle] = useState('');
  const [verifyLinkModalMessage, setVerifyLinkModalMessage] = useState('');
  
  // Account Status Modal State
  const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
  const [statusModalDetails, setStatusModalDetails] = useState({ title: '', message: '', color: '' });

  // Unified Report Problem & History State
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [isReportSentModalVisible, setIsReportSentModalVisible] = useState(false);
  const [reportText, setReportText] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [userReports, setUserReports] = useState<any[]>([]);

  // Real-time Engine State
  const [engineStatus, setEngineStatus] = useState('Checking...');
  const [isOnline, setIsOnline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Admin Check
  const [isAdmin, setIsAdmin] = useState(false);

  // User Data 
  const [userData, setUserData] = useState({
    name: 'C-SEC Agent',
    email: 'Connecting...',
    accountStatus: 'active'
  });

  // --- EDIT PROFILE MODAL STATE ---
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editImageUri, setEditImageUri] = useState<string | null>(null);
  const [editImageBase64, setEditImageBase64] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // --- DYNAMIC COLORS ---
  const bgColor = isDark ? '#121A21' : '#F9F7E8';
  const cardColor = isDark ? '#1A242E' : '#FFFFFF';
  const textColorPrimary = isDark ? '#FFFFFF' : '#1E3246';
  const textColorSecondary = isDark ? '#A9B4C0' : '#8A9AA9';
  const iconBgColor = isDark ? '#2D4356' : '#FBFBF9';
  const badgeBgColor = isDark ? '#2D4356' : '#EAE8D9';
  const modalCancelBgColor = isDark ? '#2D4356' : '#EAE8D9';
  const inputBgColor = isDark ? '#121A21' : '#F4F6F8'; 
  
  const redAccent = '#EF4444';
  const greenAccent = '#10B981';
  const blueAccent = '#4DA8DA';
  const warningAccent = '#F59E0B'; 
  const adminAccent = '#4DA8DA'; 

  // --- 1. REAL-TIME DATA FETCH ---
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    setAccountId(`CS-${user.uid.substring(0, 4).toUpperCase()}`);
    user.reload().then(() => setIsEmailVerified(user.emailVerified));

    const unsubUser = onSnapshot(doc(db, 'users', user.uid), async (docSnap) => {
      const randomDesignation = `Agent-${Math.floor(1000 + Math.random() * 9000)}`;

      if (docSnap.exists()) {
        const data = docSnap.data();
        const newStatus = data.accountStatus || 'active';

        setUserData(prev => {
          if (prev.accountStatus === 'active' && newStatus !== 'active') {
            if (newStatus === 'suspended') {
              setStatusModalDetails({ title: 'Account Suspended', message: 'Your scanning privileges have been temporarily suspended by a System Administrator.', color: warningAccent });
            } else if (newStatus === 'banned') {
              setStatusModalDetails({ title: 'Account Banned', message: 'Your account has been permanently restricted due to a violation of protocols.', color: redAccent });
            }
            setIsStatusModalVisible(true);
          }

          return {
            name: data.name || user.displayName || randomDesignation,
            email: data.email || user.email || 'N/A',
            accountStatus: newStatus
          };
        });

        if (data.profileImage) setProfileImage(data.profileImage);
        else if (user.photoURL) setProfileImage(user.photoURL);

        if (data.role === 'admin') setIsAdmin(true);

      } else {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          name: user.displayName || randomDesignation,
          email: user.email,
          createdAt: new Date(),
          role: 'user',
          accountStatus: 'active',
          profileImage: user.photoURL || null
        });
      }
    }, (error) => {
      console.warn("Profile Status Listen Error:", error.code);
    });

    return () => unsubUser();
  }, []);

  // --- 2. REAL-TIME USER REPORTS LISTENER (UPGRADED PUSH NOTIFS) ---
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(collection(db, 'reports'), where('uid', '==', user.uid));
    const unsubReports = onSnapshot(q, async (snapshot) => {
      
      // Watch for status changes to trigger a live notification
      for (const change of snapshot.docChanges()) {
        if (change.type === 'modified') {
          const data = change.doc.data();
          
          if (data.status === 'read') {
            // Prevent spam by checking local storage for this specific report ID
            const alertedKey = `notified_report_${change.doc.id}`;
            const alreadyAlerted = await AsyncStorage.getItem(alertedKey);
            
            if (!alreadyAlerted) {
              await AsyncStorage.setItem(alertedKey, 'true');
              
              // Fetch user's local notification preferences
              const storedPrefs = await AsyncStorage.getItem('csec_notification_prefs');
              const prefs = storedPrefs ? JSON.parse(storedPrefs) : null;
              
              // Only trigger if Master Push is ON and Report Updates are ON
              if (prefs && prefs.masterPushEnabled && prefs.reportUpdatesEnabled) {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: "Report Reviewed 🛡️",
                    body: "The System Admin has reviewed your recent feedback. Thank you!",
                    sound: true,
                  },
                  trigger: null, // Send instantly
                });
              } else {
                // Fallback to in-app alert if push is disabled
                Alert.alert(
                  "Report Reviewed", 
                  "The System Admin has reviewed your recent feedback. Thank you for helping keep Sentinel secure!"
                );
              }
            }
          }
        }
      }

      const fetchedReports: any[] = [];
      snapshot.forEach((doc) => {
        fetchedReports.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort newest first locally
      fetchedReports.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      
      setUserReports(fetchedReports);
    }, (error) => {
      console.warn("Profile Reports Listen Error:", error.code);
    });

    return () => unsubReports();
  }, []);

  // --- 3. REAL-TIME AI ENGINE MONITORING ---
  const checkEngine = async () => {
    try {
      const response = await fetch('https://csec-sentinel-api.onrender.com/', {
        method: 'GET',
        headers: { 
          'Accept': 'application/json',
          'Bypass-Tunnel-Reminder': 'true'
        }
      });

      if (response.ok) {
        setEngineStatus('Online');
        setIsOnline(true);
      } else {
        setEngineStatus('Offline');
        setIsOnline(false);
      }
    } catch (error) {
      setEngineStatus('Offline');
      setIsOnline(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await checkEngine();
    setRefreshing(false);
  };

  useEffect(() => {
    checkEngine(); 
    const interval = setInterval(checkEngine, 10000); 
    return () => clearInterval(interval); 
  }, []);

  // --- 4. REAL-TIME EMAIL VERIFICATION LISTENER ---
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const checkVerification = async () => {
      const user = auth.currentUser;
      if (user && !user.emailVerified) {
        await user.reload(); 
        if (user.emailVerified) {
          setIsEmailVerified(true);
          setIsVerifiedModalVisible(true); 
          clearInterval(interval); 
        }
      }
    };

    if (!isEmailVerified) {
      interval = setInterval(checkVerification, 5000); 
    }

    return () => {
      if (interval) clearInterval(interval); 
    };
  }, [isEmailVerified]);

  const handleSendVerificationEmail = async () => {
    const user = auth.currentUser;
    if (user && !user.emailVerified) {
      setIsVerificationSending(true);
      try {
        const lastSentStr = await AsyncStorage.getItem(`verify_email_sent_${user.uid}`);
        const now = Date.now();
        if (lastSentStr) {
          const lastSent = parseInt(lastSentStr, 10);
          const timeElapsed = now - lastSent;
          const waitTime = 15 * 60 * 1000; // 15 minutes
          
          if (timeElapsed < waitTime) {
            const minutesLeft = Math.ceil((waitTime - timeElapsed) / 60000);
            setVerifyLinkModalTitle("Rate Limit Active");
            setVerifyLinkModalMessage(`Please wait ${minutesLeft} minute(s) before requesting another verification email.`);
            setIsVerifyLinkModalVisible(true);
            setIsVerificationSending(false);
            return;
          }
        }

        await sendEmailVerification(user);
        await AsyncStorage.setItem(`verify_email_sent_${user.uid}`, now.toString());
        
        setVerifyLinkModalTitle("Verification Sent");
        setVerifyLinkModalMessage(`Check your inbox (${user.email}) for a verification link to secure your account.`);
        setIsVerifyLinkModalVisible(true);
      } catch (error: any) {
        if (error.code === 'auth/too-many-requests') {
          setVerifyLinkModalTitle("Notice");
          setVerifyLinkModalMessage("We recently sent an email. Please wait 15 minutes.");
          setIsVerifyLinkModalVisible(true);
        } else {
          Alert.alert("Error", error.message);
        }
      } finally {
        setIsVerificationSending(false);
      }
    }
  };

  const openEditModal = () => {
    setEditName(userData.name);
    setEditImageUri(profileImage);
    setEditImageBase64(null);
    setIsEditModalVisible(true);
  };

  const pickEditImage = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'C-SEC needs access to your gallery.');
        return;
      }
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, 
      aspect: [1, 1], 
      quality: 0.2, 
      base64: true, 
    });

    if (!result.canceled && result.assets[0].base64) {
      setEditImageUri(result.assets[0].uri); 
      setEditImageBase64(result.assets[0].base64); 
    }
  };

  const handleSaveProfile = async () => {
    const user = auth.currentUser;
    if (!user) return;

    if (editName.trim() === '') {
      Alert.alert("Error", "Name cannot be empty.");
      return;
    }

    setIsSavingProfile(true);
    let finalPhotoURL = profileImage; 

    try {
      if (editImageBase64) {
        // Upload image to Cloudinary
        const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/m1jqcmay/image/upload';
        const formData = new FormData();
        
        // Cloudinary requires the base64 string to have the data URI prefix
        formData.append('file', `data:image/jpeg;base64,${editImageBase64}`);
        formData.append('upload_preset', 'Csec_profiles');

        const response = await fetch(CLOUDINARY_URL, {
          method: 'POST',
          body: formData,
        });
        
        const data = await response.json();
        
        if (data.secure_url) {
          finalPhotoURL = data.secure_url;
        } else {
          throw new Error(data.error?.message || "Cloudinary upload failed");
        }
      }

      await updateProfile(user, { 
        displayName: editName,
        photoURL: finalPhotoURL
      });

      await updateDoc(doc(db, "users", user.uid), { 
        name: editName,
        profileImage: finalPhotoURL 
      });

      setUserData({ ...userData, name: editName });
      if (finalPhotoURL) setProfileImage(finalPhotoURL);
      
      setIsEditModalVisible(false);

    } catch (error) {
      console.error("Save Profile Error:", error);
      Alert.alert("Error", "Failed to update profile. Please try again.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!reportText.trim()) {
      Alert.alert("Notice", "Please describe the problem before submitting.");
      return;
    }

    setIsSubmittingReport(true);
    try {
      const user = auth.currentUser;
      await addDoc(collection(db, "reports"), {
        uid: user?.uid || "unknown",
        accountId: accountId,
        email: userData.email,
        name: userData.name,
        message: reportText.trim(),
        createdAt: new Date(),
        status: 'unread'
      });

      setIsReportSentModalVisible(true);
      setReportText('');
    } catch (error) {
      console.error("Report Error:", error);
      Alert.alert("Error", "Failed to send the report. Please check your connection and try again.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'suspended') return warningAccent;
    if (s === 'banned') return redAccent;
    return greenAccent; 
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={textColorPrimary} />
        }
      >
        
        <View style={styles.headerSection}>
          <View style={styles.avatarWrapper}>
            <Image 
              source={(profileImage && profileImage.trim() !== "") ? { uri: profileImage } : DEFAULT_AVATAR} 
              style={[styles.avatarImage, { borderColor: isDark ? blueAccent : '#2D4356' }]} 
            />
          </View>
          
          <Text style={[styles.userName, { color: textColorPrimary }]}>{userData.name}</Text>
          <Text style={[styles.userEmail, { color: textColorSecondary }]}>{userData.email}</Text>

          <View style={styles.badgeAndEditRow}>
            {!isEmailVerified ? (
              <TouchableOpacity 
                style={[styles.tierBadge, { backgroundColor: '#FFF0F0', borderColor: '#FDD5CD', borderWidth: 1 }]}
                onPress={handleSendVerificationEmail}
                disabled={isVerificationSending}
              >
                {isVerificationSending ? (
                  <ActivityIndicator size="small" color={redAccent} />
                ) : (
                  <>
                    <MaterialCommunityIcons name="alert-circle-outline" size={14} color={redAccent} style={{ marginRight: 6 }} />
                    <Text style={[styles.tierText, { color: redAccent }]}>VERIFY EMAIL</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View style={[styles.tierBadge, { backgroundColor: badgeBgColor }]}>
                <MaterialCommunityIcons name="check-decagram" size={14} color={greenAccent} style={{ marginRight: 6 }} />
                <Text style={[styles.tierText, { color: isDark ? '#FFFFFF' : '#606A75' }]}>VERIFIED</Text>
              </View>
            )}

            <TouchableOpacity 
              style={[styles.editProfileBtn, { backgroundColor: cardColor }]}
              onPress={openEditModal}
            >
              <Feather name="edit-2" size={14} color={textColorPrimary} style={{ marginRight: 6 }} />
              <Text style={[styles.editProfileBtnText, { color: textColorPrimary }]}>EDIT</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.statsRow, { marginBottom: 40 }]}>
          <View style={[styles.statBox, { backgroundColor: cardColor }]}>
            <Text style={[styles.statLabel, { color: textColorSecondary }]}>ACCOUNT STATUS</Text>
            <Text style={[styles.statValue, { color: getStatusColor(userData.accountStatus) }]}>
              {userData.accountStatus ? userData.accountStatus.toUpperCase() : 'ACTIVE'}
            </Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: cardColor }]}>
            <Text style={[styles.statLabel, { color: textColorSecondary }]}>AI ENGINE</Text>
            <Text style={[styles.statValue, { color: isOnline ? blueAccent : redAccent }]}>
              {engineStatus}
            </Text>
          </View>
        </View>

        <View style={styles.settingsHeader}>
          <Text style={[styles.settingsTitle, { color: textColorPrimary }]}>System Configuration</Text>
          <Text style={[styles.accountIdText, { color: textColorSecondary }]}>ID: {accountId}</Text>
        </View>

        {isAdmin && (
          <TouchableOpacity 
            style={[styles.menuItem, { backgroundColor: cardColor, borderColor: adminAccent, borderWidth: 1 }]}
            onPress={() => router.push('/admin' as any)} 
          >
            <View style={[styles.menuIconWrapper, { backgroundColor: 'rgba(77, 168, 218, 0.1)' }]}>
              <MaterialCommunityIcons name="shield-crown-outline" size={22} color={adminAccent} />
            </View>
            <Text style={[styles.menuTitle, { color: adminAccent, fontWeight: '800' }]}>Command Center</Text>
            <Feather name="chevron-right" size={20} color={adminAccent} style={styles.chevron} />
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={[styles.menuItem, { backgroundColor: cardColor }]}
          activeOpacity={0.7}
          onPress={() => router.push('/security' as any)}
        >
          <View style={[styles.menuIconWrapper, { backgroundColor: iconBgColor }]}>
            <ShieldIcon color={textColorPrimary} />
          </View>
          <Text style={[styles.menuTitle, { color: textColorPrimary }]}>Security Settings</Text>
          <Feather name="chevron-right" size={20} color="#C4CBD3" style={styles.chevron} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.menuItem, { backgroundColor: cardColor }]}
          activeOpacity={0.7}
          onPress={() => router.push('/notification' as any)}
        >
          <View style={[styles.menuIconWrapper, { backgroundColor: iconBgColor }]}>
            <BellIcon color={textColorPrimary} />
          </View>
          <Text style={[styles.menuTitle, { color: textColorPrimary }]}>Notification Prefs</Text>
          <Feather name="chevron-right" size={20} color="#C4CBD3" style={styles.chevron} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.menuItem, { backgroundColor: cardColor }]}
          activeOpacity={0.7}
          onPress={() => router.push('/appearance')}
        >
          <View style={[styles.menuIconWrapper, { backgroundColor: iconBgColor }]}>
            <Feather name="layout" size={18} color={textColorPrimary} />
          </View>
          <Text style={[styles.menuTitle, { color: textColorPrimary }]}>Appearance</Text>
          <Feather name="chevron-right" size={20} color="#C4CBD3" style={styles.chevron} />
        </TouchableOpacity>

        {/* --- UNIFIED REPORT PROBLEM & HISTORY BUTTON --- */}
        <TouchableOpacity 
          style={[styles.menuItem, { backgroundColor: cardColor }]}
          activeOpacity={0.7}
          onPress={() => setIsReportModalVisible(true)}
        >
          <View style={[styles.menuIconWrapper, { backgroundColor: iconBgColor }]}>
            <Feather name="alert-triangle" size={18} color={textColorPrimary} />
          </View>
          <Text style={[styles.menuTitle, { color: textColorPrimary }]}>Report a Problem</Text>
          {userReports.length > 0 && (
            <View style={{ backgroundColor: blueAccent, marginRight: 10, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
              <Text style={{ fontSize: 10, color: '#FFF', fontWeight: 'bold' }}>{userReports.length}</Text>
            </View>
          )}
          <Feather name="chevron-right" size={20} color="#C4CBD3" style={styles.chevron} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.logoutItem}
          onPress={() => setLogoutModalVisible(true)}
        >
          <View style={styles.logoutIconWrapper}>
            <Ionicons name="exit-outline" size={22} color="#F44336" />
          </View>
          <Text style={styles.logoutText}>Logout</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={styles.chevron} />
        </TouchableOpacity>

        <Text style={[styles.footerText, { color: textColorSecondary }]}>
          CSEC SENTINEL SECURE NODE V2.4.0 • ZERO{'\n'}TRUST PROTOCOL ACTIVE
        </Text>

      </ScrollView>

      {/* --- UNIFIED REPORT & HISTORY MODAL --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isReportModalVisible}
        onRequestClose={() => !isSubmittingReport && setIsReportModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={[styles.modalOverlayBottom, { justifyContent: 'flex-end' }]}
        >
          <View style={[styles.editModalContainer, { backgroundColor: cardColor, height: '85%' }]}>
            
            <View style={styles.editModalHeader}>
              <Text style={[styles.modalTitle, { color: textColorPrimary, marginBottom: 0 }]}>Report Problem</Text>
              <TouchableOpacity onPress={() => !isSubmittingReport && setIsReportModalVisible(false)}>
                <Feather name="x" size={24} color={textColorSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              
              <Text style={[styles.inputLabel, { color: textColorSecondary, marginBottom: 10 }]}>
                SUBMIT NEW REPORT
              </Text>
              <View style={styles.inputGroup}>
                <TextInput
                  style={[styles.textInput, { backgroundColor: inputBgColor, color: textColorPrimary, height: 100, paddingTop: 15, textAlignVertical: 'top' }]}
                  value={reportText}
                  onChangeText={setReportText}
                  placeholder="Describe the issue you are experiencing..."
                  placeholderTextColor={textColorSecondary}
                  multiline
                />
              </View>
              <TouchableOpacity 
                style={[styles.saveProfileBtn, { backgroundColor: warningAccent, marginBottom: 30 }]}
                onPress={handleSubmitReport}
                disabled={isSubmittingReport}
              >
                {isSubmittingReport ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveProfileBtnText}>SUBMIT REPORT</Text>
                )}
              </TouchableOpacity>

              <View style={[styles.divider, { backgroundColor: isDark ? '#2D4356' : '#F2F0E4', marginBottom: 20 }]} />

              <Text style={[styles.inputLabel, { color: textColorSecondary, marginBottom: 15 }]}>
                PREVIOUS REPORTS
              </Text>

              {userReports.length === 0 ? (
                <Text style={{ color: textColorSecondary, textAlign: 'center', marginTop: 10, fontStyle: 'italic' }}>
                  No previous reports found.
                </Text>
              ) : (
                userReports.map((report) => (
                  <View key={report.id} style={[styles.historyCard, { backgroundColor: inputBgColor, borderLeftColor: report.status === 'read' ? greenAccent : warningAccent }]}>
                    <View style={styles.historyHeaderRow}>
                      <Text style={[styles.historyDate, { color: textColorSecondary }]}>
                        {report.createdAt?.toDate ? report.createdAt.toDate().toLocaleDateString() : 'Recent'}
                      </Text>
                      <View style={[styles.statusPill, { backgroundColor: report.status === 'read' ? greenAccent + '20' : warningAccent + '20' }]}>
                        <Text style={[styles.statusText, { color: report.status === 'read' ? greenAccent : warningAccent }]}>
                          {report.status === 'read' ? 'REVIEWED' : 'PENDING'}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.historyMsg, { color: textColorPrimary }]}>"{report.message}"</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- SUCCESS VERIFIED MODAL --- */}
      <Modal
        animationType="fade" 
        transparent={true}
        visible={isVerifiedModalVisible}
        onRequestClose={() => setIsVerifiedModalVisible(false)}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.successModalContainer, { backgroundColor: cardColor }]}>
            <View style={[styles.successIconWrapper, { backgroundColor: '#E8F5E9' }]}>
              <MaterialCommunityIcons name="shield-check" size={40} color={greenAccent} />
            </View>
            <Text style={[styles.modalTitle, { color: textColorPrimary, marginBottom: 10 }]}>Account Verified!</Text>
            <Text style={[styles.modalBody, { color: textColorSecondary }]}>
              Your email has been successfully verified. Your Shield Status is now active and your account is secured.
            </Text>
            <TouchableOpacity 
              style={[styles.saveProfileBtn, { backgroundColor: greenAccent }]}
              onPress={() => setIsVerifiedModalVisible(false)}
            >
              <Text style={styles.saveProfileBtnText}>CONTINUE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- ACCOUNT STATUS ALERT MODAL --- */}
      <Modal
        animationType="fade" 
        transparent={true}
        visible={isStatusModalVisible}
        onRequestClose={() => setIsStatusModalVisible(false)}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.successModalContainer, { backgroundColor: cardColor, borderColor: statusModalDetails.color, borderWidth: 1 }]}>
            <View style={[styles.successIconWrapper, { backgroundColor: statusModalDetails.color + '20' }]}>
              <MaterialCommunityIcons name="alert-octagon" size={40} color={statusModalDetails.color} />
            </View>
            <Text style={[styles.modalTitle, { color: textColorPrimary, marginBottom: 10 }]}>{statusModalDetails.title}</Text>
            <Text style={[styles.modalBody, { color: textColorSecondary }]}>
              {statusModalDetails.message}
            </Text>
            <TouchableOpacity 
              style={[styles.saveProfileBtn, { backgroundColor: statusModalDetails.color }]}
              onPress={() => setIsStatusModalVisible(false)}
            >
              <Text style={styles.saveProfileBtnText}>UNDERSTOOD</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- SEND VERIFICATION EMAIL MODAL --- */}
      <Modal
        animationType="fade" 
        transparent={true}
        visible={isVerifyLinkModalVisible}
        onRequestClose={() => setIsVerifyLinkModalVisible(false)}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.successModalContainer, { backgroundColor: cardColor }]}>
            <View style={[styles.successIconWrapper, { backgroundColor: 'rgba(77, 168, 218, 0.1)' }]}>
              <Feather name="mail" size={32} color={blueAccent} />
            </View>
            <Text style={[styles.modalTitle, { color: textColorPrimary, marginBottom: 10, textAlign: 'center' }]}>
              {verifyLinkModalTitle}
            </Text>
            <Text style={[styles.modalBody, { color: textColorSecondary, textAlign: 'center' }]}>
              {verifyLinkModalMessage}
            </Text>
            <TouchableOpacity 
              style={[styles.saveProfileBtn, { backgroundColor: blueAccent }]}
              onPress={() => setIsVerifyLinkModalVisible(false)}
            >
              <Text style={styles.saveProfileBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- REPORT SENT MODAL --- */}
      <Modal
        animationType="fade" 
        transparent={true}
        visible={isReportSentModalVisible}
        onRequestClose={() => setIsReportSentModalVisible(false)}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.successModalContainer, { backgroundColor: cardColor }]}>
            <View style={[styles.successIconWrapper, { backgroundColor: 'rgba(77, 168, 218, 0.1)' }]}>
              <Feather name="send" size={32} color={blueAccent} />
            </View>
            <Text style={[styles.modalTitle, { color: textColorPrimary, marginBottom: 10, textAlign: 'center' }]}>
              Report Sent
            </Text>
            <Text style={[styles.modalBody, { color: textColorSecondary, textAlign: 'center' }]}>
              Your issue has been logged and sent to the Command Center. Thank you!
            </Text>
            <TouchableOpacity 
              style={[styles.saveProfileBtn, { backgroundColor: blueAccent }]}
              onPress={() => {
                setIsReportSentModalVisible(false);
                setIsReportModalVisible(false);
              }}
            >
              <Text style={styles.saveProfileBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- EDIT PROFILE MODAL --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isEditModalVisible}
        onRequestClose={() => !isSavingProfile && setIsEditModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.modalOverlayBottom}
        >
          <View style={[styles.editModalContainer, { backgroundColor: cardColor }]}>
            
            <View style={styles.editModalHeader}>
              <Text style={[styles.modalTitle, { color: textColorPrimary, marginBottom: 0 }]}>Edit Profile</Text>
              <TouchableOpacity onPress={() => !isSavingProfile && setIsEditModalVisible(false)}>
                <Feather name="x" size={24} color={textColorSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.editAvatarSection}>
              <Image 
                source={(editImageUri && editImageUri.trim() !== "") ? { uri: editImageUri } : DEFAULT_AVATAR} 
                style={[styles.editAvatarPreview, { borderColor: isDark ? blueAccent : '#2D4356' }]} 
              />
              <TouchableOpacity 
                style={[styles.changePictureBtn, { backgroundColor: badgeBgColor }]}
                onPress={pickEditImage}
              >
                <Feather name="camera" size={14} color={textColorPrimary} style={{ marginRight: 6 }} />
                <Text style={[styles.changePictureText, { color: textColorPrimary }]}>Change Picture</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: textColorSecondary }]}>FULL NAME</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: inputBgColor, color: textColorPrimary }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter your name"
                placeholderTextColor={textColorSecondary}
              />
            </View>

            <TouchableOpacity 
              style={[styles.saveProfileBtn, { backgroundColor: isDark ? blueAccent : '#2D4356' }]}
              onPress={handleSaveProfile}
              disabled={isSavingProfile}
            >
              {isSavingProfile ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveProfileBtnText}>SAVE CHANGES</Text>
              )}
            </TouchableOpacity>

          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- LOGOUT MODAL --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isLogoutModalVisible}
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.modalContainer, { backgroundColor: cardColor }]}>
            
            <View style={styles.modalIconWrapper}>
              <Ionicons name="log-out-outline" size={28} color="#C62828" />
            </View>
            
            <Text style={[styles.modalTitle, { color: textColorPrimary }]}>Logout?</Text>
            
            <Text style={[styles.modalBody, { color: textColorSecondary }]}>
              Are you sure you want to log out of CSEC Sentinel? You will need to re-authenticate to access your account.
            </Text>

            <TouchableOpacity 
              style={styles.modalLogoutBtn}
              activeOpacity={0.8}
              onPress={async () => {
                try {
                  const auth = getAuth();
                  await signOut(auth);
                  setLogoutModalVisible(false);
                  router.replace('/'); 
                } catch (error) {
                  console.error("Logout error:", error);
                  Alert.alert("Error", "There was a problem logging you out. Please try again.");
                }
              }}
            >
              <Text style={styles.modalLogoutBtnText}>LOGOUT</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.modalCancelBtn, { backgroundColor: modalCancelBgColor }]}
              activeOpacity={0.8}
              onPress={() => setLogoutModalVisible(false)}
            >
              <Text style={[styles.modalCancelBtnText, { color: textColorPrimary }]}>CANCEL</Text>
            </TouchableOpacity>
            
          </View>
        </View>
      </Modal>

    </View>
  );
}

const ShieldIcon = ({ color }: { color: string }) => (
  <MaterialCommunityIcons name="shield-outline" size={20} color={color} />
);
const BellIcon = ({ color }: { color: string }) => (
  <Ionicons name="notifications-outline" size={20} color={color} />
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F7E8' },
  scrollContent: { padding: 24, paddingTop: 40, paddingBottom: 140 },
  headerSection: { alignItems: 'center', marginBottom: 30 },
  avatarWrapper: { marginBottom: 20 },
  avatarImage: { width: 120, height: 120, borderRadius: 60, borderWidth: 3 },
  userName: { fontSize: 28, fontWeight: 'bold', marginBottom: 2 },
  userEmail: { fontSize: 14, fontWeight: '500', marginBottom: 12 },

  badgeAndEditRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tierBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20 },
  tierText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  
  editProfileBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3 },
  editProfileBtnText: { fontSize: 12, fontWeight: '700' },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statBox: { borderRadius: 24, padding: 24, flex: 0.48, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
  statLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  statValue: { fontSize: 20, fontWeight: 'bold' },
  
  settingsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 },
  settingsTitle: { fontSize: 18, fontWeight: 'bold' },
  accountIdText: { fontSize: 10, fontWeight: '700' },
  
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 30, marginBottom: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
  menuIconWrapper: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  menuTitle: { flex: 1, fontSize: 16, fontWeight: '600' },
  chevron: { marginLeft: 10 },
  
  logoutItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e53f3f', padding: 20, borderRadius: 30, marginBottom: 50, borderWidth: 1, borderColor: '#FDD5CD' },
  logoutIconWrapper: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  logoutText: { flex: 1, fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  footerText: { fontSize: 10, textAlign: 'center', fontWeight: '700', opacity: 0.5 },
  
  modalOverlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  
  // MODAL STYLES
  editModalContainer: { borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 20 },
  editModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  
  historyCard: { borderRadius: 16, padding: 16, marginBottom: 15, borderLeftWidth: 4, elevation: 1 },
  historyHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  historyDate: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  historyMsg: { fontSize: 14, lineHeight: 22, fontWeight: '500' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },
  divider: { height: 1 },

  editAvatarSection: { alignItems: 'center', marginBottom: 30 },
  editAvatarPreview: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, marginBottom: 15 },
  changePictureBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  changePictureText: { fontSize: 12, fontWeight: '700' },
  inputGroup: { marginBottom: 30 },
  inputLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
  textInput: { height: 55, borderRadius: 16, paddingHorizontal: 20, fontSize: 16, fontWeight: '500' },
  saveProfileBtn: { width: '100%', paddingVertical: 18, borderRadius: 25, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 4 },
  saveProfileBtnText: { color: '#FFF', fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },

  // LOGOUT/SUCCESS MODAL STYLES
  modalContainer: { borderRadius: 40, padding: 30, alignItems: 'center', width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  successModalContainer: { borderRadius: 40, padding: 30, alignItems: 'center', width: '100%', elevation: 10 },
  modalIconWrapper: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFF0F0', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  successIconWrapper: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  modalBody: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 30, paddingHorizontal: 10 },
  modalLogoutBtn: { backgroundColor: '#A31616', width: '100%', paddingVertical: 18, borderRadius: 25, alignItems: 'center', marginBottom: 12, elevation: 4 },
  modalLogoutBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
  modalCancelBtn: { width: '100%', paddingVertical: 18, borderRadius: 25, alignItems: 'center' },
  modalCancelBtnText: { fontSize: 14, fontWeight: 'bold', letterSpacing: 1 }
});