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
  TouchableOpacity,
  View
} from 'react-native';

import { getAuth, signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';

import { useTheme } from '../../context/ThemeContext';

const DEFAULT_AVATAR = require('../../assets/images/Profile/PlaceHolder.jpg'); 

export default function ProfileScreen() {
  const router = useRouter();
  const { isDark } = useTheme();

  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);
  const [accountId, setAccountId] = useState('Loading...');
  
  const [userData, setUserData] = useState({
    name: 'Loading...',
    tier: 'Loading...',
    trustScore: 100,
    activeKeys: 0
  });

  const bgColor = isDark ? '#121A21' : '#F9F7E8';
  const cardColor = isDark ? '#1A242E' : '#FFFFFF';
  const textColorPrimary = isDark ? '#FFFFFF' : '#1E3246';
  const textColorSecondary = isDark ? '#A9B4C0' : '#8A9AA9';
  const iconBgColor = isDark ? '#2D4356' : '#FBFBF9';
  const badgeBgColor = isDark ? '#2D4356' : '#EAE8D9';
  const modalCancelBgColor = isDark ? '#2D4356' : '#EAE8D9';

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        setAccountId(`CS-${user.uid.substring(0, 4).toUpperCase()}`);

        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            const emailPrefix = user.email ? user.email.split('@')[0] : 'C-SEC Agent';
            
            setUserData({
              name: data.name || user.displayName || emailPrefix,
              tier: data.tier || 'Tier 1 Analyst',
              trustScore: data.trustScore ?? 100,
              activeKeys: data.activeKeys ?? 0
            });
            if (data.profileImage) {
              setProfileImage(data.profileImage);
            } else if (user.photoURL) {
              setProfileImage(user.photoURL);
            }
          } else {
            const emailPrefix = user.email ? user.email.split('@')[0] : 'C-SEC Agent';
            const fallbackName = user.displayName || emailPrefix;
            
            await setDoc(doc(db, 'users', user.uid), {
              uid: user.uid,
              name: fallbackName,
              email: user.email,
              createdAt: new Date(),
              tier: 'Tier 1 Analyst',
              trustScore: 100,
              activeKeys: 0,
              role: 'agent',
              profileImage: user.photoURL || null
            });

            setUserData({
              name: fallbackName,
              tier: 'Tier 1 Analyst',
              trustScore: 100,
              activeKeys: 0
            });
            
            if (user.photoURL) {
              setProfileImage(user.photoURL);
            }
          }
        } catch (error) {
          console.error(error);
          const emailPrefix = user?.email ? user.email.split('@')[0] : 'C-SEC Agent';
          setUserData(prev => ({
            ...prev,
            name: user?.displayName || emailPrefix
          }));
        }
      }
    };
    fetchUserData();
  }, []);

  const pickImage = async () => {
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

    if (!result.canceled) {
      if (result.assets[0].base64) {
        setProfileImage(result.assets[0].uri); 
        await uploadToImgBB(result.assets[0].base64); 
      } else {
        Alert.alert("Error", "Could not extract image data. Please try another picture.");
      }
    }
  };

  const uploadToImgBB = async (rawBase64Data: string) => {
    const user = auth.currentUser;
    if (!user) return;

    const IMGBB_API_KEY = '97f9a172f34bcf2ef67baf01c0e47c69'; 

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', rawBase64Data);

      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        const photoURL = data.data.url;

        await setDoc(doc(db, "users", user.uid), { 
          profileImage: photoURL 
        }, { merge: true });
        await updateProfile(user, { photoURL });
        
      } else {
        throw new Error(data.error?.message || "ImgBB upload failed");
      }

    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", "Failed to upload profile picture. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        
        <View style={styles.headerSection}>
          <View style={styles.avatarWrapper}>
            <Image 
              source={(profileImage && profileImage.trim() !== "") ? { uri: profileImage } : DEFAULT_AVATAR} 
              style={[styles.avatarImage, { borderColor: isDark ? '#4DA8DA' : '#2D4356' }]} 
            />
            
            {isUploading && (
              <View style={[StyleSheet.absoluteFill, styles.uploadingOverlay]}>
                <ActivityIndicator size="large" color="#FFFFFF" />
              </View>
            )}
            
            <TouchableOpacity 
              style={[styles.editIconWrapper, { borderColor: bgColor }]} 
              activeOpacity={0.7}
              onPress={pickImage}
              disabled={isUploading} 
            >
              <Feather name="edit-2" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.userName, { color: textColorPrimary }]}>{userData.name}</Text>
          <View style={[styles.tierBadge, { backgroundColor: badgeBgColor }]}>
            <View style={[styles.tierDot, { backgroundColor: isDark ? '#4DA8DA' : '#1E3246' }]} />
            <Text style={[styles.tierText, { color: isDark ? '#FFFFFF' : '#606A75' }]}>{userData.tier}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: cardColor }]}>
            <Text style={[styles.statLabel, { color: textColorSecondary }]}>TRUST SCORE</Text>
            <Text style={[styles.statValue, { color: textColorPrimary }]}>{userData.trustScore}%</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: cardColor }]}>
            <Text style={[styles.statLabel, { color: textColorSecondary }]}>ACTIVE KEYS</Text>
            <Text style={[styles.statValue, { color: textColorPrimary }]}>{userData.activeKeys}</Text>
          </View>
        </View>

        <View style={styles.settingsHeader}>
          <Text style={[styles.settingsTitle, { color: textColorPrimary }]}>Profile Settings</Text>
          <Text style={[styles.accountIdText, { color: textColorSecondary }]}>ACCOUNT ID: {accountId}</Text>
        </View>

        <TouchableOpacity 
          style={[styles.menuItem, { backgroundColor: cardColor }]}
          activeOpacity={0.7}
          onPress={() => router.push('/security')}
        >
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

        <TouchableOpacity style={[styles.menuItem, { backgroundColor: cardColor }]}>
          <View style={[styles.menuIconWrapper, { backgroundColor: iconBgColor }]}>
            <LinkIcon color={textColorPrimary} />
          </View>
          <Text style={[styles.menuTitle, { color: textColorPrimary }]}>Linked Accounts</Text>
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

      <Modal
        animationType="fade"
        transparent={true}
        visible={isLogoutModalVisible}
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
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
                  console.error(error);
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
const LinkIcon = ({ color }: { color: string }) => (
  <Feather name="link-2" size={18} color={color} />
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F7E8' },
  scrollContent: { padding: 24, paddingTop: 40, paddingBottom: 140 },
  headerSection: { alignItems: 'center', marginBottom: 40 },
  avatarWrapper: { position: 'relative', marginBottom: 20 },
  avatarImage: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: '#2D4356' },
  uploadingOverlay: { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 60, justifyContent: 'center', alignItems: 'center' },
  editIconWrapper: { position: 'absolute', bottom: 5, right: 5, width: 36, height: 36, borderRadius: 18, backgroundColor: '#1E3246', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#F9F7E8', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 4 },
  userName: { fontSize: 28, fontWeight: 'bold', color: '#1E3246', marginBottom: 8 },
  tierBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EAE8D9', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  tierDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#1E3246', marginRight: 8 },
  tierText: { fontSize: 12, fontWeight: '700', color: '#606A75' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 },
  statBox: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, flex: 0.48, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 3 },
  statLabel: { fontSize: 10, fontWeight: '700', color: '#8A9AA9', letterSpacing: 1, marginBottom: 10 },
  statValue: { fontSize: 32, fontWeight: 'bold', color: '#1E3246' },
  settingsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20, paddingHorizontal: 4 },
  settingsTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E3246' },
  accountIdText: { fontSize: 10, fontWeight: '700', color: '#8A9AA9', letterSpacing: 1 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 20, borderRadius: 30, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 3 },
  menuIconWrapper: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FBFBF9', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  menuTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1E3246' },
  chevron: { marginLeft: 10 },
  logoutItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e53f3f', padding: 20, borderRadius: 30, marginBottom: 50, borderWidth: 1, borderColor: '#FDD5CD' },
  logoutIconWrapper: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  logoutText: { flex: 1, fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
  footerText: { fontSize: 10, color: '#A9B4C0', textAlign: 'center', letterSpacing: 0.5, lineHeight: 18, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(26, 36, 46, 0.65)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  modalContainer: { backgroundColor: '#FFFFFF', borderRadius: 40, padding: 30, alignItems: 'center', width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  modalIconWrapper: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFF0F0', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#1E3246', marginBottom: 12 },
  modalBody: { fontSize: 14, color: '#606A75', textAlign: 'center', lineHeight: 22, marginBottom: 30, paddingHorizontal: 10 },
  modalLogoutBtn: { backgroundColor: '#A31616', width: '100%', paddingVertical: 18, borderRadius: 25, alignItems: 'center', marginBottom: 12, shadowColor: '#A31616', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 4 },
  modalLogoutBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
  modalCancelBtn: { backgroundColor: '#EAE8D9', width: '100%', paddingVertical: 18, borderRadius: 25, alignItems: 'center' },
  modalCancelBtnText: { color: '#1E3246', fontSize: 14, fontWeight: 'bold', letterSpacing: 1 }
});