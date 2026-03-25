import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  TouchableOpacity, 
  ScrollView, 
  Platform, 
  Alert,
  Modal // <-- Added Modal
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Dummy asset for initial state if no local image is picked
const DEFAULT_AVATAR = require('../../assets/images/Profile/PlaceHolder.jpg'); 

export default function ProfileScreen() {
  const [profileImage, setProfileImage] = useState<string | null>(null);
  
  // State to control the Logout Modal visibility
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);
  const router = useRouter();

  const pickImage = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required', 
          'C-SEC needs access to your gallery to update your profile photo.'
        );
        return;
      }
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, 
      aspect: [1, 1], 
      quality: 0.8, 
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        
        {/* Header/Avatar Section */}
        <View style={styles.headerSection}>
          <View style={styles.avatarWrapper}>
            <Image 
              source={profileImage ? { uri: profileImage } : DEFAULT_AVATAR} 
              style={styles.avatarImage} 
            />
            
            <TouchableOpacity 
              style={styles.editIconWrapper} 
              activeOpacity={0.7}
              onPress={pickImage} 
            >
              <Feather name="edit-2" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.userName}>CSEC Agent</Text>
          <View style={styles.tierBadge}>
            <View style={styles.tierDot} />
            <Text style={styles.tierText}>Tier 1 Analyst</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>TRUST SCORE</Text>
            <Text style={styles.statValue}>90%</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>ACTIVE KEYS</Text>
            <Text style={styles.statValue}>12</Text>
          </View>
        </View>

        {/* Settings Header */}
        <View style={styles.settingsHeader}>
          <Text style={styles.settingsTitle}>Profile Settings</Text>
          <Text style={styles.accountIdText}>ACCOUNT ID: CS-9942</Text>
        </View>

        {/* Settings Menu Items */}
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuIconWrapper}>
            <ShieldIcon />
          </View>
          <Text style={styles.menuTitle}>Security Settings</Text>
          <Feather name="chevron-right" size={20} color="#C4CBD3" style={styles.chevron} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuIconWrapper}>
            <BellIcon />
          </View>
          <Text style={styles.menuTitle}>Notification Prefs</Text>
          <Feather name="chevron-right" size={20} color="#C4CBD3" style={styles.chevron} />
        </TouchableOpacity>

        {/* --- NEW APPEARANCE MENU ITEM --- */}
        <TouchableOpacity 
          style={styles.menuItem}
          activeOpacity={0.7}
          onPress={() => router.push('/appearance')}
        >
          <View style={styles.menuIconWrapper}>
            <Feather name="layout" size={18} color="#1E3246" />
          </View>
          <Text style={styles.menuTitle}>Appearance</Text>
          <Feather name="chevron-right" size={20} color="#C4CBD3" style={styles.chevron} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuIconWrapper}>
            <LinkIcon />
          </View>
          <Text style={styles.menuTitle}>Linked Accounts</Text>
          <Feather name="chevron-right" size={20} color="#C4CBD3" style={styles.chevron} />
        </TouchableOpacity>

        {/* Logout Button - Opens Modal */}
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

        {/* Technical Footer Text */}
        <Text style={styles.footerText}>
          CSEC SENTINEL SECURE NODE V2.4.0 • ZERO{'\n'}TRUST PROTOCOL ACTIVE
        </Text>

      </ScrollView>

      {/* --- LOGOUT CONFIRMATION MODAL --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isLogoutModalVisible}
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            
            <View style={styles.modalIconWrapper}>
              <Ionicons name="log-out-outline" size={28} color="#C62828" />
            </View>
            
            <Text style={styles.modalTitle}>Logout?</Text>
            
            {/* Vault feature text removed as requested */}
            <Text style={styles.modalBody}>
              Are you sure you want to log out of CSEC Sentinel? You will need to re-authenticate to access your account.
            </Text>

            <TouchableOpacity 
              style={styles.modalLogoutBtn}
              activeOpacity={0.8}
              onPress={() => {
                setLogoutModalVisible(false);
                // ADD YOUR ROUTER LOGIC HERE LATER (e.g., router.replace('/login'))
                console.log("User logged out"); 
              }}
            >
              <Text style={styles.modalLogoutBtnText}>LOGOUT</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalCancelBtn}
              activeOpacity={0.8}
              onPress={() => setLogoutModalVisible(false)}
            >
              <Text style={styles.modalCancelBtnText}>CANCEL</Text>
            </TouchableOpacity>
            
          </View>
        </View>
      </Modal>

    </View>
  );
}

const ShieldIcon = () => (
  <MaterialCommunityIcons name="shield-outline" size={20} color="#1E3246" />
);
const BellIcon = () => (
  <Ionicons name="notifications-outline" size={20} color="#1E3246" />
);
const LinkIcon = () => (
  <Feather name="link-2" size={18} color="#1E3246" />
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F7E8', 
  },
  scrollContent: {
    padding: 24,
    paddingTop: 40,
    paddingBottom: 140, 
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 20,
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#2D4356', 
  },
  editIconWrapper: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E3246', 
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#F9F7E8', 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E3246',
    marginBottom: 8,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAE8D9', 
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  tierDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1E3246',
    marginRight: 8,
  },
  tierText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#606A75',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  statBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    flex: 0.48, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8A9AA9', 
    letterSpacing: 1,
    marginBottom: 10,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1E3246',
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3246',
  },
  accountIdText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8A9AA9',
    letterSpacing: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 30,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  menuIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FBFBF9', 
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3246',
  },
  chevron: {
    marginLeft: 10,
  },
  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e53f3f', 
    padding: 20,
    borderRadius: 30,
    marginBottom: 50,
    borderWidth: 1,
    borderColor: '#FDD5CD', 
  },
  logoutIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  logoutText: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff', 
  },
  footerText: {
    fontSize: 10,
    color: '#A9B4C0',
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 18,
    fontWeight: '700',
  },

  // --- MODAL STYLES ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 36, 46, 0.65)', // Dark transparent background
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 40, // Highly rounded corners matching design
    padding: 30,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF0F0', // Soft red/pink wash
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E3246',
    marginBottom: 12,
  },
  modalBody: {
    fontSize: 14,
    color: '#606A75',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  modalLogoutBtn: {
    backgroundColor: '#A31616', // Deep red
    width: '100%',
    paddingVertical: 18,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#A31616',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  modalLogoutBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  modalCancelBtn: {
    backgroundColor: '#EAE8D9', // Light beige
    width: '100%',
    paddingVertical: 18,
    borderRadius: 25,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: '#1E3246',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});