import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView,
  Switch,
  SafeAreaView,
  Alert
} from 'react-native';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext'; 

export default function SecurityScreen() {
  const router = useRouter();
  const { isDark } = useTheme();

  const [isBiometricsEnabled, setIsBiometricsEnabled] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

  const bgColor = isDark ? '#121A21' : '#F9F7E8';
  const cardColor = isDark ? '#1A242E' : '#FFFFFF';
  const textColorPrimary = isDark ? '#FFFFFF' : '#1E3246';
  const textColorSecondary = isDark ? '#A9B4C0' : '#8A9AA9';
  const iconBgColor = isDark ? '#2D4356' : '#FBFBF9';
  const dangerAccent = '#EF4444';

  const handlePasswordReset = () => {
    Alert.alert("Password Reset", "A password reset link has been sent to your email.");
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account", 
      "Are you absolutely sure? This action cannot be undone and will permanently erase your C-SEC history.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete Everything", style: "destructive" }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bgColor }]}>
      <View style={styles.container}>
        
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
            <Text style={[styles.headerSubtitle, { color: textColorSecondary }]}>Manage your account protection.</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          <View style={[styles.settingsCard, { backgroundColor: cardColor }]}>
            <Text style={styles.sectionLabel}>AUTHENTICATION</Text>

            <TouchableOpacity 
              style={[styles.optionRow, { backgroundColor: cardColor }]} 
              activeOpacity={0.8}
              onPress={handlePasswordReset}
            >
              <View style={[styles.iconWrapper, { backgroundColor: iconBgColor }]}>
                <Feather name="key" size={18} color={textColorPrimary} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, { color: textColorPrimary }]}>Change Password</Text>
                <Text style={[styles.optionSubtitle, { color: textColorSecondary }]}>Update your master access key</Text>
              </View>
              <Feather name="chevron-right" size={20} color={textColorSecondary} />
            </TouchableOpacity>

            <View style={styles.toggleRow}>
              <View style={styles.toggleTextContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <MaterialCommunityIcons name="fingerprint" size={18} color={textColorPrimary} style={{ marginRight: 8 }} />
                  <Text style={[styles.toggleTitle, { color: textColorPrimary }]}>Biometric Login</Text>
                </View>
                <Text style={[styles.toggleSubtitle, { color: textColorSecondary }]}>Require FaceID or TouchID to open the app.</Text>
              </View>
              <Switch
                trackColor={{ false: isDark ? "#2D4356" : "#D1D5DB", true: "#4DA8DA" }}
                thumbColor={"#FFFFFF"}
                ios_backgroundColor={isDark ? "#2D4356" : "#D1D5DB"}
                onValueChange={setIsBiometricsEnabled}
                value={isBiometricsEnabled}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: isDark ? '#2D4356' : '#F2F0E4' }]} />

            <View style={[styles.toggleRow, styles.lastOptionRow]}>
              <View style={styles.toggleTextContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <MaterialCommunityIcons name="shield-key-outline" size={18} color={textColorPrimary} style={{ marginRight: 8 }} />
                  <Text style={[styles.toggleTitle, { color: textColorPrimary }]}>Two-Factor Auth</Text>
                </View>
                <Text style={[styles.toggleSubtitle, { color: textColorSecondary }]}>Require an email code on new devices.</Text>
              </View>
              <Switch
                trackColor={{ false: isDark ? "#2D4356" : "#D1D5DB", true: "#4DA8DA" }}
                thumbColor={"#FFFFFF"}
                ios_backgroundColor={isDark ? "#2D4356" : "#D1D5DB"}
                onValueChange={setIs2FAEnabled}
                value={is2FAEnabled}
              />
            </View>
          </View>

          <View style={[styles.settingsCard, { backgroundColor: cardColor }]}>
            <Text style={styles.sectionLabel}>ACTIVE SESSIONS</Text>
            
            <View style={[styles.optionRow, styles.lastOptionRow, { backgroundColor: cardColor }]}>
              <View style={[styles.iconWrapper, { backgroundColor: 'rgba(77, 168, 218, 0.1)' }]}>
                <Ionicons name="phone-portrait-outline" size={20} color="#4DA8DA" />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, { color: textColorPrimary }]}>iPhone 14 Pro (Current)</Text>
                <Text style={[styles.optionSubtitle, { color: '#4DA8DA', fontWeight: 'bold' }]}>Active now • Marikina, PH</Text>
              </View>
            </View>
          </View>

          <View style={[styles.settingsCard, { backgroundColor: cardColor }]}>
            <Text style={[styles.sectionLabel, { color: dangerAccent }]}>DANGER ZONE</Text>
            
            <TouchableOpacity 
              style={[styles.optionRow, styles.lastOptionRow, { backgroundColor: cardColor }]} 
              activeOpacity={0.8}
              onPress={handleDeleteAccount}
            >
              <View style={[styles.iconWrapper, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                <Feather name="trash-2" size={18} color={dangerAccent} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, { color: dangerAccent }]}>Delete Account</Text>
                <Text style={[styles.optionSubtitle, { color: textColorSecondary }]}>Permanently erase all your data</Text>
              </View>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9F7E8' },
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 40, marginBottom: 30 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginRight: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 3 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#1E3246' },
  headerSubtitle: { fontSize: 14, color: '#606A75', marginTop: 2 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  settingsCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 8, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 3 },
  sectionLabel: { fontSize: 10, fontWeight: '800', color: '#8A9AA9', letterSpacing: 1.5, marginLeft: 16, marginTop: 16, marginBottom: 12 },
  optionRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 4 },
  lastOptionRow: { marginBottom: 0 },
  iconWrapper: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginRight: 16, borderRadius: 20 },
  optionTextContainer: { flex: 1, justifyContent: 'center' },
  optionTitle: { fontSize: 16, fontWeight: '700' },
  optionSubtitle: { fontSize: 12, marginTop: 2 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  toggleTextContainer: { flex: 1, paddingRight: 20 },
  toggleTitle: { fontSize: 16, fontWeight: '700' },
  toggleSubtitle: { fontSize: 12, lineHeight: 18 },
  divider: { height: 1, backgroundColor: '#F2F0E4', marginHorizontal: 16 },
});