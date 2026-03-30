import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  Switch,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

// --- TUNE INTO THE RADIO TOWER ---
import { useTheme } from '../../context/ThemeContext'; 

export default function ScanScreen() {
  const [url, setUrl] = useState('');
  const [deepAiEnabled, setDeepAiEnabled] = useState(true);
  const [crossRefEnabled, setCrossRefEnabled] = useState(false);

  // 1. Grab the dark mode state
  const { isDark } = useTheme();

  // 2. Define the dynamic colors
  const bgColor = isDark ? '#121A21' : '#F9F7E8';
  const cardColor = isDark ? '#1A242E' : '#FFFFFF';
  const inputBgColor = isDark ? '#1A242E' : '#FFFFFF';
  const settingsCardBg = isDark ? '#1A242E' : '#F2F0E4';
  const textColorPrimary = isDark ? '#FFFFFF' : '#1E3246';
  const textColorSecondary = isDark ? '#A9B4C0' : '#8A9AA9';
  const pasteBtnBg = isDark ? '#2D4356' : '#F2F0E4';
  const radarCircleColor = isDark ? '#2D4356' : '#EAE8D9';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        
        {/* Header Section */}
        <Text style={[styles.headerTitle, { color: textColorPrimary }]}>Scan Link</Text>
        <Text style={[styles.headerSubtitle, { color: textColorSecondary }]}>Verify URL integrity in real-time.</Text>

        {/* URL Input Section */}
        <View style={[styles.inputContainer, { backgroundColor: inputBgColor }]}>
          <Feather name="link" size={20} color={textColorSecondary} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: textColorPrimary }]}
            placeholder="https://suspicious-site.com"
            placeholderTextColor={isDark ? "#606A75" : "#A9B4C0"}
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            keyboardType="url"
          />
          <TouchableOpacity style={[styles.pasteButton, { backgroundColor: pasteBtnBg }]}>
            <MaterialCommunityIcons name="clipboard-outline" size={14} color={isDark ? "#4DA8DA" : "#1E3246"} />
            <Text style={[styles.pasteButtonText, { color: isDark ? "#FFFFFF" : "#1E3246" }]}>PASTE</Text>
          </TouchableOpacity>
        </View>

        {/* Scan Action Button */}
        <TouchableOpacity 
          style={[styles.scanButton, { backgroundColor: isDark ? '#4DA8DA' : '#2D4356' }]} 
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="shield-check" size={20} color="#FFF" style={styles.scanButtonIcon} />
          <Text style={styles.scanButtonText}>EXECUTE MANUAL SCAN</Text>
        </TouchableOpacity>

        {/* Settings Card */}
        <View style={[styles.settingsCard, { backgroundColor: settingsCardBg }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: textColorPrimary }]}>DEEP AI ANALYSIS</Text>
              <Text style={[styles.settingSubtitle, { color: textColorSecondary }]}>Behavioral heuristic scanning</Text>
            </View>
            <Switch
              trackColor={{ false: "#D1D5DB", true: "#4DA8DA" }}
              thumbColor={"#FFFFFF"}
              ios_backgroundColor="#D1D5DB"
              onValueChange={setDeepAiEnabled}
              value={deepAiEnabled}
            />
          </View>

          <View style={[styles.settingRow, styles.settingRowNoBorder]}>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: textColorPrimary }]}>CROSS-REFERENCE DATABASES</Text>
              <Text style={[styles.settingSubtitle, { color: textColorSecondary }]}>Global blacklist synchronization</Text>
            </View>
            <Switch
              trackColor={{ false: "#D1D5DB", true: "#4DA8DA" }}
              thumbColor={"#FFFFFF"}
              ios_backgroundColor="#D1D5DB"
              onValueChange={setCrossRefEnabled}
              value={crossRefEnabled}
            />
          </View>
        </View>

        {/* Standby Status Area */}
        <View style={styles.statusContainer}>
          <View style={[styles.radarWrapper, { borderColor: radarCircleColor }]}>
            <View style={[styles.radarInner, { backgroundColor: settingsCardBg }]}>
              <MaterialCommunityIcons name="radar" size={40} color={isDark ? "#4DA8DA" : "#C4CBD3"} />
            </View>
          </View>
          <Text style={[styles.statusTitle, { color: textColorSecondary }]}>ENGINE ON STANDBY</Text>
          <Text style={[styles.statusSubtitle, { color: isDark ? "#606A75" : "#A9B4C0" }]}>
            Ready for input. Sentinel{'\n'}engine on standby.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24, paddingTop: 20, paddingBottom: 130 },
  headerTitle: { fontSize: 36, fontWeight: '800', marginBottom: 8 },
  headerSubtitle: { fontSize: 16, marginBottom: 30 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', height: 65, borderRadius: 35, paddingHorizontal: 20, marginBottom: 20, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, height: '100%' },
  pasteButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, marginLeft: 10 },
  pasteButtonText: { fontSize: 12, fontWeight: '700', marginLeft: 4, letterSpacing: 0.5 },
  scanButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 65, borderRadius: 35, marginBottom: 30, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  scanButtonIcon: { marginRight: 10 },
  scanButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', letterSpacing: 1.5 },
  settingsCard: { borderRadius: 24, padding: 24, marginBottom: 40 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  settingRowNoBorder: { marginBottom: 0 },
  settingTextContainer: { flex: 1, paddingRight: 15 },
  settingTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
  settingSubtitle: { fontSize: 12 },
  statusContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  radarWrapper: { width: 140, height: 140, borderRadius: 70, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  radarInner: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  statusTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  statusSubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});