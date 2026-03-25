import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  Switch
} from 'react-native';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

export default function ScanScreen() {
  const [url, setUrl] = useState('');
  const [deepAiEnabled, setDeepAiEnabled] = useState(true);
  const [crossRefEnabled, setCrossRefEnabled] = useState(false);

  return (
    <View style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        
        {/* Header Section */}
        <Text style={styles.headerTitle}>Scan Link</Text>
        <Text style={styles.headerSubtitle}>Verify URL integrity in real-time.</Text>

        {/* URL Input Section */}
        <View style={styles.inputContainer}>
          <Feather name="link" size={20} color="#8A9AA9" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="https://suspicious-site.com"
            placeholderTextColor="#A9B4C0"
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            keyboardType="url"
          />
          <TouchableOpacity style={styles.pasteButton}>
            <MaterialCommunityIcons name="clipboard-outline" size={14} color="#1E3246" />
            <Text style={styles.pasteButtonText}>PASTE</Text>
          </TouchableOpacity>
        </View>

        {/* Scan Action Button */}
        <TouchableOpacity style={styles.scanButton} activeOpacity={0.8}>
          <MaterialCommunityIcons name="shield-check" size={20} color="#FFF" style={styles.scanButtonIcon} />
          <Text style={styles.scanButtonText}>EXECUTE MANUAL SCAN</Text>
        </TouchableOpacity>

        {/* Settings Card */}
        <View style={styles.settingsCard}>
          {/* Setting 1 */}
          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>DEEP AI ANALYSIS</Text>
              <Text style={styles.settingSubtitle}>Behavioral heuristic scanning</Text>
            </View>
            <Switch
              trackColor={{ false: "#D1D5DB", true: "#1E3246" }}
              thumbColor={"#FFFFFF"}
              ios_backgroundColor="#D1D5DB"
              onValueChange={setDeepAiEnabled}
              value={deepAiEnabled}
            />
          </View>

          {/* Setting 2 */}
          <View style={[styles.settingRow, styles.settingRowNoBorder]}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>CROSS-REFERENCE DATABASES</Text>
              <Text style={styles.settingSubtitle}>Global blacklist synchronization</Text>
            </View>
            <Switch
              trackColor={{ false: "#D1D5DB", true: "#1E3246" }}
              thumbColor={"#FFFFFF"}
              ios_backgroundColor="#D1D5DB"
              onValueChange={setCrossRefEnabled}
              value={crossRefEnabled}
            />
          </View>
        </View>

        {/* Standby Status Area */}
        <View style={styles.statusContainer}>
          <View style={styles.radarWrapper}>
            <View style={styles.radarInner}>
              <MaterialCommunityIcons name="radar" size={40} color="#C4CBD3" />
            </View>
          </View>
          <Text style={styles.statusTitle}>ENGINE ON STANDBY</Text>
          <Text style={styles.statusSubtitle}>Ready for input. Sentinel{'\n'}engine on standby.</Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F7E8', // Matches your global app background
  },
  scrollContent: {
    padding: 24,
    paddingTop: 20,
    paddingBottom: 130, // Keeps content above the floating navigation bar
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1E3246',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#606A75',
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    height: 65,
    borderRadius: 35,
    paddingHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1E3246',
    height: '100%',
  },
  pasteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F0E4',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginLeft: 10,
  },
  pasteButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3246',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2D4356', // The dark blue button color
    height: 65,
    borderRadius: 35,
    marginBottom: 30,
    shadowColor: '#1E3246',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  scanButtonIcon: {
    marginRight: 10,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  settingsCard: {
    backgroundColor: '#F2F0E4', // Light beige to match the image
    borderRadius: 24,
    padding: 24,
    marginBottom: 40,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  settingRowNoBorder: {
    marginBottom: 0,
  },
  settingTextContainer: {
    flex: 1,
    paddingRight: 15,
  },
  settingTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3246',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#8A9AA9',
  },
  statusContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  radarWrapper: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
    borderColor: '#EAE8D9',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  radarInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F2F0E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8A9AA9',
    letterSpacing: 1,
    marginBottom: 8,
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#A9B4C0',
    textAlign: 'center',
    lineHeight: 20,
  },
});