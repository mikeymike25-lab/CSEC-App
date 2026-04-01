import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// --- FIREBASE IMPORTS ---
import { getAuth, sendEmailVerification, signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
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
  
  // Real-time Engine State
  const [engineStatus, setEngineStatus] = useState('Checking...');
  const [isOnline, setIsOnline] = useState(false);
  
  // FIX: Replaced "Loading..." with a cooler default fallback
  const [userData, setUserData] = useState({
    name: 'C-SEC Agent',
    email: 'Connecting...'
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

  // --- 1. INITIAL FETCH ---
  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        setAccountId(`CS-${user.uid.substring(0, 4).toUpperCase()}`);
        await user.reload(); 
        setIsEmailVerified(user.emailVerified);

        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          
          // Generate a random tactical name just in case the real name is missing
          const randomDesignation = `Agent-${Math.floor(1000 + Math.random() * 9000)}`;

          if (userDoc.exists()) {
            const data = userDoc.data();
            
            setUserData({
              // Try DB Name -> Auth Name -> Random Name
              name: data.name || user.displayName || randomDesignation,
              email: data.email || user.email || 'N/A',
            });

            if (data.profileImage) {
              setProfileImage(data.profileImage);
            } else if (user.photoURL) {
              setProfileImage(user.photoURL);
            }
          } else {
            // Auto-heal missing firestore doc
            await setDoc(doc(db, 'users', user.uid), {
              uid: user.uid,
              name: user.displayName || randomDesignation,
              email: user.email,
              createdAt: new Date(),
              role: 'user',
              profileImage: user.photoURL || null
            });
            
            setUserData({
              name: user.displayName || randomDesignation,
              email: user.email || 'N/A',
            });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          // Fallback if network fails completely
          setUserData(prev => ({
            ...prev,
            name: user?.displayName || 'C-SEC Agent',
            email: user?.email || 'N/A'
          }));
        }
      }
    };
    fetchUserData();
  }, []);

  // --- 2. REAL-TIME AI ENGINE MONITORING ---
  useEffect(() => {
    const checkEngine = async () => {
      try {
        const response = await fetch('https://scaling-fortnight-pjwxgqgjxjxrcr466-5000.app.github.dev/', {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
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

    checkEngine(); 
    const interval = setInterval(checkEngine, 10000); 
    return () => clearInterval(interval); 
  }, []);

  // --- 3. REAL-TIME EMAIL VERIFICATION LISTENER ---
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

  // --- 4. SEND VERIFICATION EMAIL ---
  const handleSendVerificationEmail = async () => {
    const user = auth.currentUser;
    if (user && !user.emailVerified) {
      setIsVerificationSending(true);
      try {
        await sendEmailVerification(user);
        Alert.alert("Link Sent", `Check your Gmail (${user.email}) to verify your account.`);
      } catch (error: any) {
        if (error.code === 'auth/too-many-requests') {
          Alert.alert("Notice", "We recently sent an email. Please wait a moment.");
        } else {
          Alert.alert("Error", error.message);
        }
      } finally {
        setIsVerificationSending(false);
      }
    }
  };

  // --- 5. EDIT PROFILE LOGIC ---
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
        const IMGBB_API_KEY = '97f9a172f34bcf2ef67baf01c0e47c69'; 
        const formData = new FormData();
        formData.append('image', editImageBase64);

        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        
        if (data.success) {
          finalPhotoURL = data.data.url;
        } else {
          throw new Error("ImgBB upload failed");
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

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        
        {/* Header/Avatar Section */}
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
            {/* REAL EMAIL VERIFICATION BADGE */}
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

            {/* EDIT PROFILE BUTTON */}
            <TouchableOpacity 
              style={[styles.editProfileBtn, { backgroundColor: cardColor }]}
              onPress={openEditModal}
            >
              <Feather name="edit-2" size={14} color={textColorPrimary} style={{ marginRight: 6 }} />
              <Text style={[styles.editProfileBtnText, { color: textColorPrimary }]}>EDIT</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* App Status Indicators */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: cardColor }]}>
            <Text style={[styles.statLabel, { color: textColorSecondary }]}>ACCOUNT STATUS</Text>
            <Text style={[styles.statValue, { color: isEmailVerified ? greenAccent : redAccent }]}>
              {isEmailVerified ? 'Secured' : 'Pending'}
            </Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: cardColor }]}>
            <Text style={[styles.statLabel, { color: textColorSecondary }]}>AI ENGINE</Text>
            <Text style={[styles.statValue, { color: isOnline ? blueAccent : redAccent }]}>
              {engineStatus}
            </Text>
          </View>
        </View>

        {/* Settings Header */}
        <View style={styles.settingsHeader}>
          <Text style={[styles.settingsTitle, { color: textColorPrimary }]}>System Configuration</Text>
          <Text style={[styles.accountIdText, { color: textColorSecondary }]}>ID: {accountId}</Text>
        </View>

        {/* Settings Menu Items */}
        <TouchableOpacity style={[styles.menuItem, { backgroundColor: cardColor }]}>
          <View style={[styles.menuIconWrapper, { backgroundColor: iconBgColor }]}>
            <ShieldIcon color={textColorPrimary} />
          </View>
          <Text style={[styles.menuTitle, { color: textColorPrimary }]}>Security Settings</Text>
          <Feather name="chevron-right" size={20} color="#C4CBD3" style={styles.chevron} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, { backgroundColor: cardColor }]}>
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

        {/* Logout Button */}
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

      {/* --- EDIT PROFILE MODAL --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isEditModalVisible}
        onRequestClose={() => !isSavingProfile && setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlayBottom}>
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
        </View>
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

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 },
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
  
  // EDIT MODAL STYLES
  editModalContainer: { borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 20 },
  editModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
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