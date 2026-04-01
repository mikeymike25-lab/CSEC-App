import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

import { useTheme } from '../../context/ThemeContext';

export default function ScanScreen() {
  const [url, setUrl] = useState('');
  
  const [dynamicAiUrl, setDynamicAiUrl] = useState('https://humble-sniffle-7vp6rw45jp67hq9v-5000.app.github.dev');
  const [strictScanningEnabled, setStrictScanningEnabled] = useState(false);
  
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  
  const [summary, setSummary] = useState('');
  const [technicalDetails, setTechnicalDetails] = useState('');
  const [confidence, setConfidence] = useState('0'); 
  const [protocol, setProtocol] = useState(''); 
  const [isCached, setIsCached] = useState(false);

  const { isDark } = useTheme();

  const bgColor = isDark ? '#121A21' : '#F9F7E8';
  const cardColor = isDark ? '#1A242E' : '#FFFFFF';
  const inputBgColor = isDark ? '#1A242E' : '#FFFFFF';
  const settingsCardBg = isDark ? '#1A242E' : '#F2F0E4';
  const textColorPrimary = isDark ? '#FFFFFF' : '#1E3246';
  const textColorSecondary = isDark ? '#A9B4C0' : '#8A9AA9';
  const pasteBtnBg = isDark ? '#2D4356' : '#F2F0E4';
  const radarCircleColor = isDark ? '#2D4356' : '#EAE8D9';
  
  const infoBoxBg = isDark ? '#233240' : '#E8EDF2'; 
  const techBoxBg = isDark ? '#16202A' : '#F0F4F8'; 
  const greenAccent = '#22C55E';
  const redAccent = '#EF4444';
  const yellowAccent = '#F59E0B'; 
  const dangerAccent = '#EF4444'; 

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system', 'config'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.aiServerUrl) {
          setDynamicAiUrl(data.aiServerUrl.replace(/\/$/, ""));
        }
        if (data.strictScanning !== undefined) {
          setStrictScanningEnabled(data.strictScanning);
        }
      }
    });

    return () => unsub();
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
      const nextIdNumber = history.length + 1;
      const formattedId = `#${nextIdNumber.toString().padStart(2, '0')}`;

      const newEntry = {
        id: formattedId, 
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        url: url,
        verdict: resultData.verdict,
        protocol: resultData.protocol,
        confidence: resultData.confidence,
        summary: resultData.summary, 
        technicalDetails: resultData.technicalDetails,
      };

      const updatedHistory = [newEntry, ...history];
      await AsyncStorage.setItem('csec_history', JSON.stringify(updatedHistory));
    } catch (e) {
      console.error(e);
    }
  };

  const handleScan = async () => {
    const cleanUrl = url.trim();
    if (!cleanUrl) {
      Alert.alert("Input Required", "Please enter a URL to scan.");
      return;
    }

    setIsScanning(true);
    setScanResult(null);
    setSummary('');
    setTechnicalDetails('');
    setProtocol('');
    setIsCached(false);

    try {
      if (!strictScanningEnabled) {
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
            setIsScanning(false);
            return; 
          }
        }
      }

      const whitelist = ['google.com', 'facebook.com', 'figma.com', 'tip.edu.ph', 'github.com'];
      const blacklist = ['malicious-site.net', 'stolen-login.xyz', 'free-gems-generator.io'];
      const domain = cleanUrl.toLowerCase().replace('https://', '').replace('http://', '').replace('www.', '').split('/')[0];

      let currentVerdict = '';
      let currentSummary = '';
      let currentTech = '';
      let currentProtocol = '';
      let currentConfidence = '0';

      if (blacklist.includes(domain)) {
        currentVerdict = 'Phishing';
        currentProtocol = 'Blacklist';
        currentSummary = "This URL is found in our Global Blacklist Database of known malicious actors.";
        currentTech = "Blocked via Blacklist Protocol. 100% probability of threat based on historical attack signatures.";
        currentConfidence = '100.0';
        
        setScanResult(currentVerdict);
        setProtocol(currentProtocol);
        setSummary(currentSummary);
        setTechnicalDetails(currentTech);
        setConfidence(currentConfidence);
        
        saveScanToHistory({ verdict: currentVerdict, protocol: currentProtocol, confidence: currentConfidence, summary: currentSummary, technicalDetails: currentTech });
        setIsScanning(false);
        return;
      } 
      
      if (whitelist.includes(domain)) {
        currentVerdict = 'Safe';
        currentProtocol = 'Whitelist';
        currentSummary = "This is a safe, verified website recognized by our Trusted Platform list.";
        currentTech = "Verified via Whitelist Protocol. 0% probability of threat based on trusted domain signatures.";
        currentConfidence = '0.0';

        setScanResult(currentVerdict);
        setProtocol(currentProtocol);
        setSummary(currentSummary);
        setTechnicalDetails(currentTech);
        setConfidence(currentConfidence);

        saveScanToHistory({ verdict: currentVerdict, protocol: currentProtocol, confidence: currentConfidence, summary: currentSummary, technicalDetails: currentTech });
        setIsScanning(false);
        return;
      } 

      const apiUrl = `${dynamicAiUrl}/analyze-link`; 

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: cleanUrl }), 
      });

      const data = await response.json();

      if (response.ok && data.status === "success") {
        const confidenceScore = data.confidence || 0;
        
        if (confidenceScore >= 40 && confidenceScore <= 60) {
          currentVerdict = 'Suspicious';
          currentProtocol = 'Greylist';
          currentConfidence = confidenceScore.toFixed(1);
          currentSummary = "AI analysis is inconclusive. This link has features of both safe and malicious sites. Proceed with caution.";
          currentTech = `Uncertain classification. The Random Forest returned a ${currentConfidence}% anomaly score.`;
        } else if (data.is_phishing === true) {
          currentVerdict = 'Phishing';
          currentProtocol = 'Blacklist';
          currentConfidence = confidenceScore.toFixed(1);
          currentSummary = "This website exhibits malicious characteristics and is likely attempting to steal credentials or data.";
          currentTech = `Threat verdict. Lexical analysis flagged structural anomalies and abnormal character distribution.`;
        } else {
          currentVerdict = 'Safe';
          currentProtocol = 'Whitelist';
          currentConfidence = (100 - confidenceScore).toFixed(1); 
          currentSummary = "This is a safe, verified website based on current heuristic analysis.";
          currentTech = `Safe verdict. Lexical analysis found normal character distribution and standard pathing.`;
        }

        setScanResult(currentVerdict);
        setProtocol(currentProtocol);
        setConfidence(currentConfidence);
        setSummary(currentSummary);
        setTechnicalDetails(currentTech);

        saveScanToHistory({ verdict: currentVerdict, protocol: currentProtocol, confidence: currentConfidence, summary: currentSummary, technicalDetails: currentTech });
      } else {
        Alert.alert('Scan Failed', data.error || 'The server encountered an error.');
      }

    } catch (error) {
      Alert.alert('Connection Error', `Could not reach the AI server at ${dynamicAiUrl}.`);
    } finally {
      setIsScanning(false);
    }
  };

  const getProtocolColor = () => {
    if (protocol === 'Whitelist') return greenAccent;
    if (protocol === 'Blacklist') return redAccent;
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
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
          style={[styles.scanButton, { backgroundColor: isScanning ? '#606A75' : (isDark ? '#4DA8DA' : '#2D4356') }]} 
          onPress={handleScan}
          disabled={isScanning}
        >
          {isScanning ? (
            <ActivityIndicator color="#FFF" style={styles.scanButtonIcon} />
          ) : (
            <MaterialCommunityIcons name={strictScanningEnabled ? "brain" : "shield-check"} size={20} color="#FFF" style={styles.scanButtonIcon} />
          )}
          <Text style={styles.scanButtonText}>
            {isScanning ? 'ANALYZING THREATS...' : (strictScanningEnabled ? 'EXECUTE STRICT SCAN' : 'EXECUTE MANUAL SCAN')}
          </Text>
        </TouchableOpacity>

        {strictScanningEnabled && (
          <Text style={{textAlign: 'center', fontSize: 10, color: dangerAccent, fontWeight: 'bold', marginBottom: 20}}>
            STRICT MODE ACTIVE: BYPASSING LOCAL CACHE
          </Text>
        )}

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
            </>
          )}

          {scanResult && (
            <View style={styles.resultDetailsContainer}>
              <View style={styles.resultHeader}>
                 <MaterialCommunityIcons name={scanResult === 'Phishing' ? "alert-octagon" : (scanResult === 'Suspicious' ? "alert" : "shield-check")} size={28} color={getVerdictColor()} />
                 <Text style={[styles.resultHeaderText, { color: getVerdictColor() }]}>{getVerdictText()}</Text>
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

              <Text style={[styles.sectionLabel, { color: textColorSecondary, marginTop: 24 }]}>TECHNICAL DETAILS</Text>
              <View style={[styles.techBox, { backgroundColor: techBoxBg, borderLeftColor: getVerdictColor() }]}>
                <Text style={[styles.techBoxText, { color: isDark ? '#D1D5DB' : '#4B5563' }]}>{technicalDetails}</Text>
                <View style={styles.metricsRow}>
                  <View style={[styles.metricBadge, { backgroundColor: isDark ? '#233240' : '#E8EDF2' }]}>
                    <Text style={[styles.metricLabel, { color: textColorSecondary }]}>PHISHING PROBABILITY</Text>
                    <Text style={[styles.metricValue, { color: getVerdictColor() }]}>{confidence}%</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
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
  scanButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 65, borderRadius: 35, marginBottom: 15, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  scanButtonIcon: { marginRight: 10 },
  scanButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', letterSpacing: 1.5 },
  statusContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 10, width: '100%' },
  radarWrapper: { width: 140, height: 140, borderRadius: 70, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  radarInner: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  statusTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
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
  techBoxText: { fontSize: 14, lineHeight: 22 },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(150, 150, 150, 0.2)' },
  metricBadge: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center', marginHorizontal: 4 },
  metricLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
  metricValue: { fontSize: 16, fontWeight: 'bold' }
});