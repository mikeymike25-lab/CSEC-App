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

// --- TUNE INTO THE RADIO TOWER ---
import { useTheme } from '../context/ThemeContext'; 

export default function AppearanceScreen() {
  const router = useRouter();

  // Pull the current theme and the update function directly from Context!
  const { themePreference, isDark, updateTheme } = useTheme();

  // Local state for toggles
  const [isStealthMode, setIsStealthMode] = useState(false);
  const [isReduceMotion, setIsReduceMotion] = useState(false);

  // Dynamic colors based on isDark (which is now controlled globally!)
  const bgColor = isDark ? '#121A21' : '#F9F7E8';
  const cardColor = isDark ? '#1A242E' : '#FFFFFF';
  const textColorPrimary = isDark ? '#FFFFFF' : '#1E3246';
  const textColorSecondary = isDark ? '#A9B4C0' : '#8A9AA9';
  const iconBgColor = isDark ? '#2D4356' : '#FBFBF9';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bgColor }]}>
      <View style={styles.container}>
        
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: cardColor }]} 
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={24} color={textColorPrimary} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: textColorPrimary }]}>Appearance</Text>
            <Text style={[styles.headerSubtitle, { color: textColorSecondary }]}>Customize your interface.</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Theme Selection Card */}
          <View style={[styles.settingsCard, { backgroundColor: cardColor }]}>
            <Text style={styles.sectionLabel}>THEME PREFERENCE</Text>

            {/* Option 1: System Default */}
            <TouchableOpacity 
              style={[
                styles.optionRow, 
                { backgroundColor: cardColor },
                themePreference === 'system' && styles.optionRowActive
              ]} 
              onPress={() => updateTheme('system')} // Uses Context update
              activeOpacity={0.8}
            >
              <View style={[styles.iconWrapper, { backgroundColor: themePreference === 'system' ? 'transparent' : iconBgColor }]}>
                <Feather name="smartphone" size={20} color={themePreference === 'system' ? '#FFFFFF' : textColorPrimary} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, { color: textColorPrimary }, themePreference === 'system' && styles.optionTitleActive]}>System Default</Text>
                <Text style={[styles.optionSubtitle, { color: textColorSecondary }, themePreference === 'system' && styles.optionSubtitleActive]}>Matches your device settings</Text>
              </View>
              {themePreference === 'system' && <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />}
            </TouchableOpacity>

            {/* Option 2: Light Mode */}
            <TouchableOpacity 
              style={[
                styles.optionRow, 
                { backgroundColor: cardColor },
                themePreference === 'light' && styles.optionRowActive
              ]} 
              onPress={() => updateTheme('light')} // Uses Context update
              activeOpacity={0.8}
            >
              <View style={[styles.iconWrapper, { backgroundColor: themePreference === 'light' ? 'transparent' : iconBgColor }]}>
                <Feather name="sun" size={20} color={themePreference === 'light' ? '#FFFFFF' : textColorPrimary} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, { color: textColorPrimary }, themePreference === 'light' && styles.optionTitleActive]}>Light Mode</Text>
              </View>
              {themePreference === 'light' && <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />}
            </TouchableOpacity>

            {/* Option 3: Dark Mode */}
            <TouchableOpacity 
              style={[
                styles.optionRow, 
                styles.lastOptionRow, 
                { backgroundColor: cardColor },
                themePreference === 'dark' && styles.optionRowActive
              ]} 
              onPress={() => updateTheme('dark')} // Uses Context update
              activeOpacity={0.8}
            >
              <View style={[styles.iconWrapper, { backgroundColor: themePreference === 'dark' ? 'transparent' : iconBgColor }]}>
                <Feather name="moon" size={20} color={themePreference === 'dark' ? '#FFFFFF' : textColorPrimary} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, { color: textColorPrimary }, themePreference === 'dark' && styles.optionTitleActive]}>Dark Mode</Text>
              </View>
              {themePreference === 'dark' && <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />}
            </TouchableOpacity>
          </View>

          {/* Privacy & Accessibility Card */}
          <View style={[styles.settingsCard, { backgroundColor: cardColor }]}>
            <Text style={styles.sectionLabel}>PRIVACY & ACCESSIBILITY</Text>

            {/* Stealth Mode Toggle */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleTextContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <MaterialCommunityIcons name="incognito" size={18} color={textColorPrimary} style={{ marginRight: 8 }} />
                  <Text style={[styles.toggleTitle, { color: textColorPrimary }]}>Stealth Mode</Text>
                </View>
                <Text style={[styles.toggleSubtitle, { color: textColorSecondary }]}>Obscures URLs and IP addresses in History until tapped.</Text>
              </View>
              <Switch
                trackColor={{ false: isDark ? "#2D4356" : "#D1D5DB", true: "#4DA8DA" }}
                thumbColor={"#FFFFFF"}
                ios_backgroundColor={isDark ? "#2D4356" : "#D1D5DB"}
                onValueChange={setIsStealthMode}
                value={isStealthMode}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: isDark ? '#2D4356' : '#F2F0E4' }]} />

            {/* Reduce Motion Toggle */}
            <View style={[styles.toggleRow, styles.lastOptionRow]}>
              <View style={styles.toggleTextContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Feather name="wind" size={18} color={textColorPrimary} style={{ marginRight: 8 }} />
                  <Text style={[styles.toggleTitle, { color: textColorPrimary }]}>Reduce Motion</Text>
                </View>
                <Text style={[styles.toggleSubtitle, { color: textColorSecondary }]}>Disables radar animations and smooth UI transitions.</Text>
              </View>
              <Switch
                trackColor={{ false: isDark ? "#2D4356" : "#D1D5DB", true: "#4DA8DA" }}
                thumbColor={"#FFFFFF"}
                ios_backgroundColor={isDark ? "#2D4356" : "#D1D5DB"}
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
  safeArea: { flex: 1, backgroundColor: '#F9F7E8' },
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 40, marginBottom: 30 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginRight: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 3 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#1E3246' },
  headerSubtitle: { fontSize: 14, color: '#606A75', marginTop: 2 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  settingsCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 8, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 3 },
  sectionLabel: { fontSize: 10, fontWeight: '800', color: '#8A9AA9', letterSpacing: 1.5, marginLeft: 16, marginTop: 16, marginBottom: 12 },
  optionRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 4, backgroundColor: '#FFFFFF' },
  optionRowActive: { backgroundColor: '#1E3246' },
  lastOptionRow: { marginBottom: 0 },
  iconWrapper: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginRight: 16, borderRadius: 20 },
  optionTextContainer: { flex: 1, justifyContent: 'center' },
  optionTitle: { fontSize: 16, fontWeight: '700', color: '#1E3246' },
  optionTitleActive: { color: '#FFFFFF' },
  optionSubtitle: { fontSize: 12, color: '#8A9AA9', marginTop: 2 },
  optionSubtitleActive: { color: '#A9B4C0' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  toggleTextContainer: { flex: 1, paddingRight: 20 },
  toggleTitle: { fontSize: 16, fontWeight: '700', color: '#1E3246' },
  toggleSubtitle: { fontSize: 12, color: '#8A9AA9', lineHeight: 18 },
  divider: { height: 1, backgroundColor: '#F2F0E4', marginHorizontal: 16 },
});