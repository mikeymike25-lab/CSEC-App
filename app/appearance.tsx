import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView,
  Switch,
  SafeAreaView
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function AppearanceScreen() {
  const router = useRouter();

  // State for our settings
  const [themePreference, setThemePreference] = useState('system');
  const [isStealthMode, setIsStealthMode] = useState(false);
  const [isReduceMotion, setIsReduceMotion] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={24} color="#1E3246" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Appearance</Text>
            <Text style={styles.headerSubtitle}>Customize your interface.</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Theme Selection Card */}
          <View style={styles.settingsCard}>
            <Text style={styles.sectionLabel}>THEME PREFERENCE</Text>

            {/* Option 1: System Default */}
            <TouchableOpacity 
              style={[styles.optionRow, themePreference === 'system' && styles.optionRowActive]} 
              onPress={() => setThemePreference('system')}
              activeOpacity={0.8}
            >
              <View style={styles.iconWrapper}>
                <Feather name="smartphone" size={20} color={themePreference === 'system' ? '#FFFFFF' : '#1E3246'} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, themePreference === 'system' && styles.optionTitleActive]}>System Default</Text>
                <Text style={[styles.optionSubtitle, themePreference === 'system' && styles.optionSubtitleActive]}>Matches your device settings</Text>
              </View>
              {themePreference === 'system' && <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />}
            </TouchableOpacity>

            {/* Option 2: Light Mode */}
            <TouchableOpacity 
              style={[styles.optionRow, themePreference === 'light' && styles.optionRowActive]} 
              onPress={() => setThemePreference('light')}
              activeOpacity={0.8}
            >
              <View style={styles.iconWrapper}>
                <Feather name="sun" size={20} color={themePreference === 'light' ? '#FFFFFF' : '#1E3246'} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, themePreference === 'light' && styles.optionTitleActive]}>Light Mode</Text>
              </View>
              {themePreference === 'light' && <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />}
            </TouchableOpacity>

            {/* Option 3: Dark Mode */}
            <TouchableOpacity 
              style={[styles.optionRow, styles.lastOptionRow, themePreference === 'dark' && styles.optionRowActive]} 
              onPress={() => setThemePreference('dark')}
              activeOpacity={0.8}
            >
              <View style={styles.iconWrapper}>
                <Feather name="moon" size={20} color={themePreference === 'dark' ? '#FFFFFF' : '#1E3246'} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, themePreference === 'dark' && styles.optionTitleActive]}>Dark Mode</Text>
              </View>
              {themePreference === 'dark' && <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />}
            </TouchableOpacity>
          </View>

          {/* Privacy & Accessibility Card */}
          <View style={styles.settingsCard}>
            <Text style={styles.sectionLabel}>PRIVACY & ACCESSIBILITY</Text>

            {/* Stealth Mode Toggle */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleTextContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <MaterialCommunityIcons name="incognito" size={18} color="#1E3246" style={{ marginRight: 8 }} />
                  <Text style={styles.toggleTitle}>Stealth Mode</Text>
                </View>
                <Text style={styles.toggleSubtitle}>Obscures URLs and IP addresses in History until tapped.</Text>
              </View>
              <Switch
                trackColor={{ false: "#D1D5DB", true: "#1E3246" }}
                thumbColor={"#FFFFFF"}
                ios_backgroundColor="#D1D5DB"
                onValueChange={setIsStealthMode}
                value={isStealthMode}
              />
            </View>

            <View style={styles.divider} />

            {/* Reduce Motion Toggle */}
            <View style={[styles.toggleRow, styles.lastOptionRow]}>
              <View style={styles.toggleTextContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Feather name="wind" size={18} color="#1E3246" style={{ marginRight: 8 }} />
                  <Text style={styles.toggleTitle}>Reduce Motion</Text>
                </View>
                <Text style={styles.toggleSubtitle}>Disables radar animations and smooth UI transitions.</Text>
              </View>
              <Switch
                trackColor={{ false: "#D1D5DB", true: "#1E3246" }}
                thumbColor={"#FFFFFF"}
                ios_backgroundColor="#D1D5DB"
                onValueChange={setIsReduceMotion}
                value={isReduceMotion}
              />
            </View>
          </View>

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9F7E8',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    marginBottom: 30,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E3246',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#606A75',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 8,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8A9AA9',
    letterSpacing: 1.5,
    marginLeft: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 4,
    backgroundColor: '#FFFFFF',
  },
  optionRowActive: {
    backgroundColor: '#1E3246', // C-SEC Navy for active state
  },
  lastOptionRow: {
    marginBottom: 0,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3246',
  },
  optionTitleActive: {
    color: '#FFFFFF',
  },
  optionSubtitle: {
    fontSize: 12,
    color: '#8A9AA9',
    marginTop: 2,
  },
  optionSubtitleActive: {
    color: '#A9B4C0',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  toggleTextContainer: {
    flex: 1,
    paddingRight: 20,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3246',
  },
  toggleSubtitle: {
    fontSize: 12,
    color: '#8A9AA9',
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: '#F2F0E4',
    marginHorizontal: 16,
  },
});