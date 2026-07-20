import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// --- FIREBASE IMPORTS ---
import { getAuth } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

import { useTheme } from '../../context/ThemeContext';

export default function ScanScreen() {
  const [url, setUrl] = useState('');
  const [deepAiEnabled, setDeepAiEnabled] = useState(true);
  
  // States for AI Integration
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  
  // States for the detailed history/scan breakdown
  const [summary, setSummary] = useState('');
  const [technicalDetails, setTechnicalDetails] = useState('');
  const [confidence, setConfidence] = useState('0'); 
  const [protocol, setProtocol] = useState(''); 
  const [sentinelAnalysis, setSentinelAnalysis] = useState('');
  const [isCached, setIsCached] = useState(false);

  // --- MODAL & SECURITY STATES ---
  const [isVerificationModalVisible, setIsVerificationModalVisible] = useState(false);
  const [accountStatus, setAccountStatus] = useState('active'); // Tracks real-time status
  const [isStatusModalVisible, setIsStatusModalVisible] = useState(false); // Modal for suspended/banned
  const [isInvalidUrlModalVisible, setIsInvalidUrlModalVisible] = useState(false);

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
  
  // Colors for the new detailed boxes and protocols
  const infoBoxBg = isDark ? '#233240' : '#E8EDF2'; 
  const techBoxBg = isDark ? '#16202A' : '#F0F4F8'; 
  const greenAccent = '#22C55E';
  const redAccent = '#EF4444';
  const yellowAccent = '#F59E0B'; 

  // --- NEW: REAL-TIME STATUS LISTENER ---
  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
      // Listen to the user's document to see if an Admin suspends/bans them
      const unsub = onSnapshot(
        doc(db, 'users', user.uid), 
        (docSnap) => {
          if (docSnap.exists()) {
            const status = docSnap.data().accountStatus || 'active';
            setAccountStatus(status);
          }
        },
        (error) => {
          console.warn("Scan Status Listen Error:", error.code);
        }
      );
      return () => unsub(); // Cleanup on unmount
    }
  }, []);

  const handlePaste = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      setUrl(text); 
    } catch (error) {
      Alert.alert("Error", "Could not paste from clipboard.");
    }
  };

  const saveScanToHistory = async (resultData: any) => {
    try {
      const existingHistory = await AsyncStorage.getItem('csec_history');
      const history = existingHistory ? JSON.parse(existingHistory) : [];

      const randomId = Math.floor(1000 + Math.random() * 9000);
      const formattedId = `#${randomId}`;

      const newEntry = {
        id: formattedId, 
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        url: url,
        verdict: resultData.verdict,
        protocol: resultData.protocol,
        confidence: resultData.confidence,
        summary: resultData.summary, 
        technicalDetails: resultData.technicalDetails,
        sentinelAnalysis: resultData.sentinelAnalysis,
      };

      const updatedHistory = [newEntry, ...history];
      await AsyncStorage.setItem('csec_history', JSON.stringify(updatedHistory));
      console.log(`Scan ${formattedId} saved to history successfully!`);
    } catch (e) {
      console.error("Failed to save history:", e);
    }
  };

  const handleScan = async () => {
    const auth = getAuth();
    const user = auth.currentUser;

    // --- SECURITY GATE 1: ACCOUNT STATUS LOCKDOWN ---
    if (accountStatus !== 'active') {
      setIsStatusModalVisible(true);
      return;
    }

    // --- SECURITY GATE 2: VERIFICATION LOCKDOWN ---
    if (user && !user.emailVerified) {
      await user.reload(); 
      if (!user.emailVerified) {
        setIsVerificationModalVisible(true); 
        return; 
      }
    }

    const cleanUrl = url.trim();
    if (!cleanUrl) {
      Alert.alert("Input Required", "Please enter a URL to scan.");
      return;
    }

    const urlRegex = /^(?:https?:\/\/)?(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/i;
    if (!urlRegex.test(cleanUrl)) {
      setIsInvalidUrlModalVisible(true);
      return;
    }

    setIsScanning(true);
    setScanResult(null);
    setSummary('');
    setTechnicalDetails('');
    setProtocol('');
    setSentinelAnalysis('');
    setIsCached(false);

    try {
      // --- LOCAL HISTORY CROSS-REFERENCE (CACHE) ---
      const existingHistory = await AsyncStorage.getItem('csec_history');
      if (existingHistory) {
        const historyArray = JSON.parse(existingHistory);
        const cachedMatch = historyArray.find((item: any) => item.url.toLowerCase() === cleanUrl.toLowerCase());

        if (cachedMatch) {
          setIsCached(true);
          setScanResult(cachedMatch.verdict);
          setProtocol(cachedMatch.protocol); 
          setConfidence(cachedMatch.confidence);
          setSummary(cachedMatch.summary);
          setTechnicalDetails(`[Retrieved from Local Cache] ${cachedMatch.technicalDetails}`);
          setSentinelAnalysis(cachedMatch.sentinelAnalysis || 'No AI analysis saved for this scan.');
          setIsScanning(false);
          return; 
        }
      }

      // --- SERVER ARCHITECTURE ---
      if (deepAiEnabled) {
        const apiUrl = 'https://csec-sentinel-api.onrender.com/analyze-link';

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Bypass-Tunnel-Reminder': 'true'
          },
          body: JSON.stringify({ url: cleanUrl }), 
        });

        const data = await response.json();

        if (response.ok && data.status === "success") {
          let currentVerdict = data.verdict; 
          let serverProtocol = data.protocol;
          
          // --- CALCULATE TRUE PHISHING PROBABILITY ---
          let rawConfidence = data.confidence || 0;
          let phishingProb = 0;

          if (serverProtocol.includes('Blacklist')) {
            phishingProb = 100;
          } else if (serverProtocol.includes('Whitelist')) {
            phishingProb = 0;
          } else if (data.is_phishing === false || currentVerdict === 'Safe') {
            phishingProb = 100 - rawConfidence;
          } else {
            phishingProb = rawConfidence;
          }

          let currentConfidence = phishingProb.toFixed(1);
          let currentSummary = '';
          let currentTech = '';
          let currentProtocol = serverProtocol;

          // --- HARDCODED EXPLANATIONS & GREYLIST LOGIC ---
          if (serverProtocol.includes('Levenshtein')) {
            // Extract the targeted domain from the server's response (e.g., 'google.com')
            const spoofMatch = data.summary?.match(/spoof '([^']+)'/);
            const targetDomain = spoofMatch ? spoofMatch[1].toUpperCase() : "A TRUSTED SITE";
            
            currentSummary = `Typosquatting alert! This URL is a fake version of ${targetDomain}. Do not trust it.`;
            currentTech = "Blocked via Levenshtein String Analysis. Edit distance algorithm detected a high-probability spoofing attempt.";
            currentVerdict = 'Phishing';
          }
          else if (serverProtocol.includes('AI')) {
            if (phishingProb >= 40 && phishingProb <= 60) {
              currentVerdict = 'Suspicious';
              currentProtocol = 'Heuristic Greylist';
              currentSummary = "AI analysis is inconclusive. This link has features of both safe and malicious sites. Proceed with caution.";
              currentTech = `Uncertain classification. The Random Forest returned a ${currentConfidence}% anomaly score.`;
            } else if (currentVerdict === 'Phishing') {
              currentProtocol = 'AI RF Analysis'; 
              currentSummary = "This website exhibits malicious characteristics and is likely attempting to steal credentials or data.";
              currentTech = "Threat verdict. Lexical analysis flagged suspicious structural anomalies and abnormal character distribution.";
            } else {
              currentProtocol = 'AI RF Analysis'; 
              currentSummary = "This is a safe, verified website based on current heuristic analysis.";
              currentTech = "Safe verdict. Lexical analysis found normal character distribution, optimal length, and standard pathing.";
            }
          } 
          else if (serverProtocol.includes('Blacklist')) {
            currentSummary = "This URL is found in our Global Blacklist Database of known malicious actors.";
            currentTech = "Blocked via Blacklist Protocol. 100% probability of threat based on historical attack signatures.";
          } 
          else if (serverProtocol.includes('Whitelist')) {
            currentSummary = "This is a safe, verified website recognized by our Trusted Platform list.";
            currentTech = "Verified via Whitelist Protocol. 0% probability of threat based on trusted domain signatures.";
          }

          setScanResult(currentVerdict);
          setProtocol(currentProtocol);
          setConfidence(currentConfidence);
          setSummary(currentSummary);
          setTechnicalDetails(currentTech);
          setSentinelAnalysis(data.sentinel_analysis || 'AI Analysis unavailable at this time.');

          saveScanToHistory({ 
            verdict: currentVerdict, 
            protocol: currentProtocol, 
            confidence: currentConfidence, 
            summary: currentSummary, 
            technicalDetails: currentTech,
            sentinelAnalysis: data.sentinel_analysis
          });

        } else {
          console.error('API Error:', data.error);
          Alert.alert('Scan Failed', data.error || 'The server encountered an error.');
        }
      } else {
        Alert.alert('Scan Disabled', 'Please enable Deep AI Scanning.');
      }

    } catch (error) {
      console.error('Network Error:', error);
      Alert.alert('Connection Error', 'Could not reach the AI server. Is your Codespace running and public?');
    } finally {
      setIsScanning(false);
    }
  };

  const getProtocolColor = () => {
    if (protocol.includes('Whitelist') || (protocol === 'AI RF Analysis' && scanResult === 'Safe')) return greenAccent;
    if (protocol.includes('Blacklist') || (protocol === 'AI RF Analysis' && scanResult === 'Phishing')) return redAccent;
    return yellowAccent; 
  };

  const getVerdictColor = () => {
    if (scanResult === 'Phishing') return redAccent;
    if (scanResult === 'Suspicious') return yellowAccent;
    return greenAccent;
  };

  const getVerdictText = () => {
    if (isCached) {
      if (scanResult === 'Phishing') return 'KNOWN THREAT (CACHED)';
      if (scanResult === 'Suspicious') return 'KNOWN RISK (CACHED)';
      return 'VERIFIED SAFE (CACHED)';
    } else {
      if (scanResult === 'Phishing') return 'THREAT DETECTED';
      if (scanResult === 'Suspicious') return 'POTENTIAL RISK';
      return 'URL IS SAFE';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        
        <Text style={[styles.headerTitle, { color: textColorPrimary }]}>Scan Link</Text>
        <Text style={[styles.headerSubtitle, { color: textColorSecondary }]}>Verify URL integrity in real-time.</Text>

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
          <TouchableOpacity style={[styles.pasteButton, { backgroundColor: pasteBtnBg }]} onPress={handlePaste}>
            <MaterialCommunityIcons name="clipboard-outline" size={14} color={isDark ? "#4DA8DA" : "#1E3246"} />
            <Text style={[styles.pasteButtonText, { color: isDark ? "#FFFFFF" : "#1E3246" }]}>PASTE</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[
            styles.scanButton, 
            { backgroundColor: accountStatus !== 'active' ? redAccent : (isScanning ? '#606A75' : (isDark ? '#4DA8DA' : '#2D4356')) }
          ]} 
          activeOpacity={0.8}
          onPress={handleScan}
          disabled={isScanning}
        >
          {isScanning ? (
            <ActivityIndicator color="#FFF" style={styles.scanButtonIcon} />
          ) : (
            <MaterialCommunityIcons 
              name={accountStatus !== 'active' ? "shield-lock" : "shield-check"} 
              size={20} 
              color="#FFF" 
              style={styles.scanButtonIcon} 
            />
          )}
          <Text style={styles.scanButtonText}>
            {accountStatus !== 'active' ? 'SCANNING DISABLED' : (isScanning ? 'ANALYZING THREATS...' : 'EXECUTE MANUAL SCAN')}
          </Text>
        </TouchableOpacity>

        <View style={styles.statusContainer}>
          
          {!scanResult && (
            <>
              <View style={[styles.radarWrapper, { borderColor: radarCircleColor }]}>
                <View style={[styles.radarInner, { backgroundColor: settingsCardBg }]}>
                  <MaterialCommunityIcons name={isScanning ? "radar" : "shield-outline"} size={40} color={isDark ? "#4DA8DA" : "#C4CBD3"} />
                </View>
              </View>
              <Text style={[styles.statusTitle, { color: textColorSecondary }]}>
                {isScanning ? 'SCANNING...' : 'ENGINE ON STANDBY'}
              </Text>
              <Text style={[styles.statusSubtitle, { color: isDark ? "#606A75" : "#A9B4C0" }]}>
                {isScanning ? 'Analyzing structural features...' : 'Ready for input. Sentinel engine on standby.'}
              </Text>
            </>
          )}

          {scanResult && (
            <View style={styles.resultDetailsContainer}>
              
              <View style={styles.resultHeader}>
                 <MaterialCommunityIcons 
                    name={scanResult === 'Phishing' ? "alert-octagon" : (scanResult === 'Suspicious' ? "alert" : "shield-check")} 
                    size={28} 
                    color={getVerdictColor()} 
                 />
                 <Text style={[styles.resultHeaderText, { color: getVerdictColor() }]}>
                    {getVerdictText()}
                 </Text>
              </View>

              <Text style={[styles.sectionLabel, { color: textColorSecondary }]}>LIST PROTOCOL</Text>
              <View style={styles.protocolContainer}>
                <View style={[styles.protocolDot, { backgroundColor: getProtocolColor() }]} />
                <Text style={[styles.protocolText, { color: textColorPrimary }]}>{protocol}</Text>
              </View>

              <Text style={[styles.sectionLabel, { color: textColorSecondary, marginTop: 12 }]}>PLAIN ENGLISH SUMMARY</Text>
              <View style={[styles.infoBox, { backgroundColor: infoBoxBg }]}>
                <Feather name="info" size={18} color={textColorPrimary} style={styles.infoIcon} />
                <Text style={[styles.infoText, { color: textColorPrimary }]}>{summary}</Text>
              </View>

              <Text style={[styles.sectionLabel, { color: textColorSecondary, marginTop: 24 }]}>THE CSEC SENTINEL ANALYSIS</Text>
              <View style={[
                styles.techBox, 
                { backgroundColor: isDark ? '#1A2A3A' : '#E8F4F8', borderLeftColor: '#3B82F6' }
              ]}>
                <View style={styles.techBoxHeader}>
                  <MaterialCommunityIcons 
                    name="robot-outline" 
                    size={16} 
                    color="#3B82F6" 
                  />
                  <Text style={[styles.techBoxTitle, { color: '#3B82F6' }]}>
                    AI SECURITY EXPERT
                  </Text>
                </View>
                <Text style={[styles.techBoxText, { color: isDark ? '#D1D5DB' : '#4B5563', fontStyle: 'italic' }]}>
                  {sentinelAnalysis.split(/(\*\*.*?\*\*)/g).map((part, index) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                      return <Text key={index} style={{ fontWeight: 'bold' }}>{part.replace(/\*\*/g, '')}</Text>;
                    }
                    return <Text key={index}>{part}</Text>;
                  })}
                </Text>
              </View>

              <Text style={[styles.sectionLabel, { color: textColorSecondary, marginTop: 24 }]}>TECHNICAL DETAILS</Text>
              <View style={[
                styles.techBox, 
                { backgroundColor: techBoxBg, borderLeftColor: getVerdictColor() }
              ]}>
                <View style={styles.techBoxHeader}>
                  <MaterialCommunityIcons 
                    name="cpu-64-bit" 
                    size={16} 
                    color={getVerdictColor()} 
                  />
                  <Text style={[styles.techBoxTitle, { color: getVerdictColor() }]}>
                    {scanResult === 'Phishing' ? 'MALICIOUS SIGNATURE' : (scanResult === 'Suspicious' ? 'HEURISTIC GREY ZONE' : 'TRUSTED PLATFORM')}
                  </Text>
                </View>
                <Text style={[styles.techBoxText, { color: isDark ? '#D1D5DB' : '#4B5563' }]}>
                  {technicalDetails}
                </Text>

                <View style={styles.metricsRow}>
                  <View style={[styles.metricBadge, { backgroundColor: isDark ? '#233240' : '#E8EDF2' }]}>
                    <Text style={[styles.metricLabel, { color: textColorSecondary }]}>RF MODEL F1 SCORE</Text>
                    <Text style={[styles.metricValue, { color: textColorPrimary }]}>95%</Text>
                  </View>
                  <View style={[styles.metricBadge, { backgroundColor: isDark ? '#233240' : '#E8EDF2' }]}>
                    <Text style={[styles.metricLabel, { color: textColorSecondary }]}>PHISHING PROBABILITY</Text>
                    <Text style={[styles.metricValue, { color: getVerdictColor() }]}>
                      {confidence}%
                    </Text>
                  </View>
                </View>

              </View>

            </View>
          )}

        </View>
      </ScrollView>

      {/* --- VERIFICATION REQUIRED MODAL --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isVerificationModalVisible}
        onRequestClose={() => setIsVerificationModalVisible(false)}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.modalContainer, { backgroundColor: cardColor }]}>
            
            <View style={[styles.modalIconWrapper, { backgroundColor: '#FFF0F0' }]}>
              <MaterialCommunityIcons name="shield-lock-outline" size={32} color={redAccent} />
            </View>
            
            <Text style={[styles.modalTitle, { color: textColorPrimary }]}>Verification Required</Text>
            
            <Text style={[styles.modalBody, { color: textColorSecondary }]}>
              Your account must be verified to perform heuristic URL scanning. Please check your email inbox or visit your Profile to secure your account.
            </Text>

            <TouchableOpacity 
              style={[styles.modalActionBtn, { backgroundColor: isDark ? '#4DA8DA' : '#2D4356' }]}
              activeOpacity={0.8}
              onPress={() => setIsVerificationModalVisible(false)}
            >
              <Text style={styles.modalActionBtnText}>UNDERSTOOD</Text>
            </TouchableOpacity>
            
          </View>
        </View>
      </Modal>

      {/* --- STATUS LOCKDOWN MODAL --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isStatusModalVisible}
        onRequestClose={() => setIsStatusModalVisible(false)}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.modalContainer, { backgroundColor: cardColor, borderColor: redAccent, borderWidth: 1 }]}>
            
            <View style={[styles.modalIconWrapper, { backgroundColor: redAccent + '20' }]}>
              <MaterialCommunityIcons name="alert-octagon" size={32} color={redAccent} />
            </View>
            
            <Text style={[styles.modalTitle, { color: textColorPrimary }]}>Access Restricted</Text>
            
            <Text style={[styles.modalBody, { color: textColorSecondary }]}>
              Your scanning privileges have been revoked by a System Administrator. If you believe this is an error, please contact support.
            </Text>

            <TouchableOpacity 
              style={[styles.modalActionBtn, { backgroundColor: redAccent }]}
              activeOpacity={0.8}
              onPress={() => setIsStatusModalVisible(false)}
            >
              <Text style={styles.modalActionBtnText}>ACKNOWLEDGE</Text>
            </TouchableOpacity>
            
          </View>
        </View>
      </Modal>

      {/* --- INVALID URL MODAL --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isInvalidUrlModalVisible}
        onRequestClose={() => setIsInvalidUrlModalVisible(false)}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.modalContainer, { backgroundColor: cardColor }]}>
            
            <View style={[styles.modalIconWrapper, { backgroundColor: yellowAccent + '20' }]}>
              <Feather name="alert-triangle" size={32} color={yellowAccent} />
            </View>
            
            <Text style={[styles.modalTitle, { color: textColorPrimary }]}>Invalid URL</Text>
            
            <Text style={[styles.modalBody, { color: textColorSecondary }]}>
              Please input a valid URL to scan. Ensure it has a correct domain format (e.g., example.com).
            </Text>

            <TouchableOpacity 
              style={[styles.modalActionBtn, { backgroundColor: yellowAccent }]}
              activeOpacity={0.8}
              onPress={() => setIsInvalidUrlModalVisible(false)}
            >
              <Text style={styles.modalActionBtnText}>GOT IT</Text>
            </TouchableOpacity>
            
          </View>
        </View>
      </Modal>

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
  
  statusContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 10, width: '100%' },
  radarWrapper: { width: 140, height: 140, borderRadius: 70, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  radarInner: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  statusTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  statusSubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  resultDetailsContainer: { width: '100%', marginTop: 10 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
  resultHeaderText: { fontSize: 18, fontWeight: '800', letterSpacing: 1, marginLeft: 10 },
  
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 12, opacity: 0.8 },
  
  protocolContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  protocolDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  protocolText: { fontSize: 16, fontWeight: '600' },

  infoBox: { flexDirection: 'row', padding: 16, borderRadius: 12, alignItems: 'center' },
  infoIcon: { marginRight: 12, marginTop: 2, alignSelf: 'flex-start' },
  infoText: { flex: 1, fontSize: 14, lineHeight: 22, fontWeight: '500' },

  techBox: { padding: 16, borderRadius: 12, borderLeftWidth: 4 },
  techBoxHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  techBoxTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginLeft: 6 },
  techBoxText: { fontSize: 14, lineHeight: 22 },

  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(150, 150, 150, 0.2)' },
  metricBadge: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center', marginHorizontal: 4 },
  metricLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
  metricValue: { fontSize: 16, fontWeight: 'bold' },

  // --- MODAL STYLES ---
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 },
  modalContainer: { borderRadius: 30, padding: 30, alignItems: 'center', width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  modalIconWrapper: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  modalBody: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 30, paddingHorizontal: 10 },
  modalActionBtn: { width: '100%', paddingVertical: 18, borderRadius: 25, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 4 },
  modalActionBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
});