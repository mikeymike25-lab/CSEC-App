import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { 
  Alert, 
  ActivityIndicator, 
  DeviceEventEmitter, 
  Linking, 
  Modal, 
  Platform, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View 
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth'; 
import { FlagContent, FlagType } from './FlagModals';
import * as WebBrowser from 'expo-web-browser';
import { submitThreatReport } from '../services/threatIntelService';

const API_URL = 'https://csec-sentinel-api.onrender.com/analyze-link';

export interface LinkInterceptorRef {
  triggerTestScan: (testUrl: string, testType: FlagType) => void;
}

const LinkInterceptor = forwardRef<LinkInterceptorRef, {}>((props, ref) => {
  const [visible, setVisible] = useState(false);
  const [type, setType] = useState<FlagType>('scanning');
  const [url, setUrl] = useState('');
  
  const [isCached, setIsCached] = useState(false);
  const [protocol, setProtocol] = useState('');
  const [summary, setSummary] = useState('');
  const [technicalDetails, setTechnicalDetails] = useState('');
  const [sentinelAnalysis, setSentinelAnalysis] = useState('');
  
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('Suspected Phishing');
  const [reportNotes, setReportNotes] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error';
    reportCount?: number;
  } | null>(null);

  const reportReasons = [
    { id: 'Suspected Phishing', label: 'Suspected Phishing / Fake Portal' },
    { id: 'Malicious Redirect', label: 'Malicious / Deceptive Redirect' },
    { id: 'False Positive', label: 'False Positive (Safe Link Flagged)' },
    { id: 'Malware / Exploit', label: 'Malware Download / Exploit' },
    { id: 'Other Suspicious Activity', label: 'Other Security Threat' }
  ];

  const handleOpenReport = () => {
    setReportReason(type === 'safe' ? 'False Positive' : 'Suspected Phishing');
    setReportNotes('');
    setIsReportModalVisible(true);
  };

  const handleSubmitReport = async () => {
    if (!url.trim()) return;
    setIsSubmittingReport(true);
    try {
      const initialVerdict = type === 'danger' ? 'Phishing' : (type === 'warning' ? 'Suspicious' : 'Safe');
      const res = await submitThreatReport(url.trim(), reportReason, initialVerdict, reportNotes.trim());
      setIsReportModalVisible(false);
      setFeedbackModal({
        visible: true,
        title: 'Report Transmitted',
        message: res.message,
        type: 'success',
        reportCount: res.reportCount
      });
    } catch (e: any) {
      setFeedbackModal({
        visible: true,
        title: 'Submission Failed',
        message: e?.message || 'Unable to submit report. Please check your network connection.',
        type: 'error'
      });
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const router = useRouter();

  useImperativeHandle(ref, () => ({
    triggerTestScan: (testUrl: string, testType: FlagType) => {
      setUrl(testUrl);
      setType(testType);
      setIsCached(false);
      setProtocol('Test Mode');
      setVisible(true);
    }
  }));

  // THE REAL SENTINEL ENGINE INTEGRATION
  const analyzeUrlWithCSEC = async (targetUrl: string): Promise<{ type: FlagType, cached: boolean, proto: string, summary?: string, technicalDetails?: string, sentinelAnalysis?: string }> => {
    try {
      // --- VERIFICATION LOCKDOWN ---
      const auth = getAuth();
      const user = auth.currentUser;

      if (user && !user.emailVerified) {
        await user.reload(); 
        if (!user.emailVerified) {
          return { type: 'unverified', cached: false, proto: 'Locked' };
        }
      }

      // --- GATE 0: LOCAL CACHE CHECK (WITH 24H TTL) ---
      const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
      const existingHistory = await AsyncStorage.getItem('csec_history');
      if (existingHistory) {
        const historyArray = JSON.parse(existingHistory);
        const cachedMatch = historyArray.find((item: any) => item.url.toLowerCase() === targetUrl.toLowerCase());

        const isExpired = !cachedMatch?.timestamp || (Date.now() - cachedMatch.timestamp > CACHE_TTL_MS);

        if (cachedMatch && !isExpired) {
          let cachedType: FlagType = 'safe';
          if (cachedMatch.verdict === 'Phishing') cachedType = 'danger';
          if (cachedMatch.verdict === 'Suspicious') cachedType = 'warning';
          
          // Return the cached flag!
          return { type: cachedType, cached: true, proto: cachedMatch.protocol, summary: cachedMatch.summary, technicalDetails: cachedMatch.technicalDetails, sentinelAnalysis: cachedMatch.sentinelAnalysis };
        }
      }

      // --- DYNAMIC THREAT INTEL CHECK ---
      try {
        const { getDoc, doc } = require('firebase/firestore');
        const { db } = require('../firebaseConfig');
        const threatDocSnap = await getDoc(doc(db, 'system', 'threat_intel'));
        if (threatDocSnap.exists()) {
          const threatData = threatDocSnap.data();
          const dynamicWhitelist: string[] = Array.isArray(threatData?.whitelist) ? threatData.whitelist : [];
          const dynamicBlacklist: string[] = Array.isArray(threatData?.blacklist) ? threatData.blacklist : [];

          const strippedHost = targetUrl.toLowerCase().replace(/^(?:https?:\/\/)?(?:www\.)?/i, '').split('/')[0];

          if (dynamicBlacklist.some((b: string) => targetUrl.toLowerCase().includes(b.toLowerCase()) || strippedHost === b.toLowerCase())) {
            const currentVerdict = 'Phishing';
            const currentProtocol = 'Global Blacklist (Threat Intel)';
            const currentSummary = 'This URL has been flagged as a confirmed threat by C-SEC Security Intelligence.';
            const currentTech = 'Threat verdict. Matched dynamic administrative blacklist override.';
            const currentSentinel = 'Explicitly blacklisted by security administrators.';
            await saveToHistory({
              url: targetUrl,
              verdict: currentVerdict,
              protocol: currentProtocol,
              confidence: '100.0',
              summary: currentSummary,
              technicalDetails: currentTech,
              sentinelAnalysis: currentSentinel
            });
            return { type: 'danger', cached: false, proto: currentProtocol, summary: currentSummary, technicalDetails: currentTech, sentinelAnalysis: currentSentinel };
          }

          if (dynamicWhitelist.some((w: string) => targetUrl.toLowerCase().includes(w.toLowerCase()) || strippedHost === w.toLowerCase())) {
            const currentVerdict = 'Safe';
            const currentProtocol = 'Platform Whitelist (Threat Intel)';
            const currentSummary = 'This URL is verified safe by C-SEC Security Intelligence override.';
            const currentTech = 'Verified via Administrative Whitelist Protocol. 0% probability of threat.';
            const currentSentinel = 'Verified and cleared by administrative threat intelligence.';
            await saveToHistory({
              url: targetUrl,
              verdict: currentVerdict,
              protocol: currentProtocol,
              confidence: '0.0',
              summary: currentSummary,
              technicalDetails: currentTech,
              sentinelAnalysis: currentSentinel
            });
            return { type: 'safe', cached: false, proto: currentProtocol, summary: currentSummary, technicalDetails: currentTech, sentinelAnalysis: currentSentinel };
          }
        }
      } catch (threatErr) {
        console.warn("[LinkInterceptor] Threat intel check skipped:", threatErr);
      }

      // --- GATE 1, 2, 3: SERVER FETCH ---
      const idToken = user ? await user.getIdToken() : '';
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Bypass-Tunnel-Reminder': 'true'
      };
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ url: targetUrl }),
      });

      if (!response.ok) throw new Error('C-SEC Server Unreachable');
      
      const data = await response.json();

      let currentVerdict = data.verdict; 
      let serverProtocol = data.protocol;
      
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
      let currentSentinel = data.sentinel_analysis || 'AI Analysis unavailable at this time.';
      let currentProtocol = serverProtocol;
      let uiType: FlagType = 'safe';

      // --- HARDCODED EXPLANATIONS & GREYLIST LOGIC ---
      if (serverProtocol.includes('Levenshtein')) {
        // Extract the targeted domain from the server's response (e.g., 'google.com')
        const spoofMatch = data.summary?.match(/spoof '([^']+)'/);
        const targetDomain = spoofMatch ? spoofMatch[1].toUpperCase() : "A TRUSTED SITE";
        
        currentSummary = `Typosquatting alert! This URL is a fake version of ${targetDomain}. Do not trust it.`;
        currentTech = "Blocked via Levenshtein String Analysis. Edit distance algorithm detected a high-probability spoofing attempt.";
        uiType = 'danger';
      }
      else if (serverProtocol.includes('AI')) {
        if (phishingProb >= 40 && phishingProb <= 60) {
          currentVerdict = 'Suspicious';
          currentProtocol = 'Heuristic Greylist';
          currentSummary = "AI analysis is inconclusive. This link has features of both safe and malicious sites. Proceed with caution.";
          currentTech = `Uncertain classification. The Random Forest returned a ${currentConfidence}% anomaly score.`;
          uiType = 'warning';
        } else if (currentVerdict === 'Phishing') {
          currentProtocol = 'AI RF Analysis'; 
          currentSummary = "This website exhibits malicious characteristics and is likely attempting to steal credentials or data.";
          currentTech = "Threat verdict. Lexical analysis flagged suspicious structural anomalies and abnormal character distribution.";
          uiType = 'danger';
        } else {
          currentProtocol = 'AI RF Analysis'; 
          currentSummary = "This is a safe, verified website based on current heuristic analysis.";
          currentTech = "Safe verdict. Lexical analysis found normal character distribution, optimal length, and standard pathing.";
          uiType = 'safe';
        }
      } 
      else if (serverProtocol.includes('Blacklist')) {
        currentSummary = "This URL is found in our Global Blacklist Database of known malicious actors.";
        currentTech = "Blocked via Blacklist Protocol. 100% probability of threat based on historical attack signatures.";
        uiType = 'danger';
      } 
      else if (serverProtocol.includes('Whitelist')) {
        currentSummary = "This is a safe, verified website recognized by our Trusted Platform list.";
        currentTech = "Verified via Whitelist Protocol. 0% probability of threat based on trusted domain signatures.";
        uiType = 'safe';
      }

      // Save to history only if it wasn't cached
      await saveToHistory({ 
        url: targetUrl,
        verdict: currentVerdict, 
        protocol: currentProtocol, 
        confidence: currentConfidence, 
        summary: currentSummary, 
        technicalDetails: currentTech,
        sentinelAnalysis: currentSentinel
      });

      return { type: uiType, cached: false, proto: currentProtocol, summary: currentSummary, technicalDetails: currentTech, sentinelAnalysis: currentSentinel };

    } catch (error) {
      console.error("Engine Error:", error);
      return { type: 'warning', cached: false, proto: 'Offline Fallback' };
    }
  };

  useEffect(() => {
    // Web browsers open the app at window.location.href (e.g. http://localhost:8081).
    // LinkInterceptor is exclusively for native OS deep link intents (e.g. clicking external links on Android/iOS).
    if (Platform.OS === 'web') {
      return;
    }

    const handleIncomingLink = async (incomingUrl: string | null) => {
      // Ignore empty links or internal app links
      if (!incomingUrl || incomingUrl.startsWith('csec://') || incomingUrl.startsWith('exp://')) return;

      const trimmedUrl = incomingUrl.trim();
      // Enforce strict HTTP/HTTPS protocol validation on incoming links
      if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
        console.warn(`[LinkInterceptor] Ignored non-HTTP/HTTPS link intent: ${trimmedUrl}`);
        return;
      }

      // Ignore local development hosts, tunnels, and loopback addresses
      if (
        trimmedUrl.includes('localhost') ||
        trimmedUrl.includes('127.0.0.1') ||
        trimmedUrl.includes('10.0.2.2') ||
        trimmedUrl.includes(':8081')
      ) {
        return;
      }

      // --- THE MAGIC FIX ---
      setTimeout(() => {
        router.replace('/tabs');
      }, 100);

      setUrl(incomingUrl);
      setType('scanning');
      setVisible(true);

      const result = await analyzeUrlWithCSEC(incomingUrl);
      setType(result.type); 
      setIsCached(result.cached);   // Update Cache State
      setProtocol(result.proto);    // Update Protocol State
      setSummary(result.summary || '');
      setTechnicalDetails(result.technicalDetails || '');
      setSentinelAnalysis(result.sentinelAnalysis || '');
    };

    const checkInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) handleIncomingLink(initialUrl);
    };
    checkInitialUrl();

    const subscription = Linking.addEventListener('url', ({ url: incomingUrl }) => {
      handleIncomingLink(incomingUrl);
    });

    return () => subscription.remove();
  }, []);

  const saveToHistory = async (resultData: any) => {
    try {
      const existingData = await AsyncStorage.getItem('csec_history');
      const history = existingData ? JSON.parse(existingData) : [];

      const randomId = Math.floor(1000 + Math.random() * 9000);
      const formattedId = `#${randomId}`;

      const historyItem = {
        id: formattedId,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        timestamp: Date.now(),
        url: resultData.url,
        verdict: resultData.verdict,
        protocol: resultData.protocol,
        confidence: resultData.confidence,
        summary: resultData.summary,
        technicalDetails: resultData.technicalDetails,
        sentinelAnalysis: resultData.sentinelAnalysis
      };

      const filteredHistory = history.filter((item: any) => item.url?.toLowerCase() !== resultData.url?.toLowerCase());
      const updatedHistory = [historyItem, ...filteredHistory]; 
      await AsyncStorage.setItem('csec_history', JSON.stringify(updatedHistory));
      
      // Notify active screens (like Home) that a scan finished
      DeviceEventEmitter.emit('CSEC_SCAN_COMPLETED');

      // Update home screen widget (Android only)
      if (Platform.OS === 'android') {
        try {
          const { updateWidget } = require('../widget/WidgetTaskHandler');
          updateWidget();
        } catch (err) {
          console.error("Widget Update Failed:", err);
        }
      }
      
    } catch (e) {
      console.error("History Save Failed:", e);
    }
  };

  return (
    <>
      <Modal
        animationType="fade"
        transparent={true}
        visible={visible}
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.overlay}>
          <FlagContent 
            type={type}
            url={url}
            isCached={isCached}   // Pass down cache status
            protocol={protocol}   // Pass down protocol
            summary={summary}     // Pass down summary
            technicalDetails={technicalDetails} // Pass down technical details
            sentinelAnalysis={sentinelAnalysis} // Pass down sentinel analysis
            onReport={handleOpenReport}
            onProceed={async () => {
              setVisible(false);
              const target = (url || '').trim();
              if (!target.startsWith('http://') && !target.startsWith('https://')) {
                Alert.alert(
                  "Untrusted Protocol",
                  "For your security, C-SEC Sentinel only permits opening verified HTTP and HTTPS web links."
                );
                return;
              }
              try {
                await WebBrowser.openBrowserAsync(target);
              } catch (err) {
                console.error("[LinkInterceptor] Failed to open browser:", err);
                Alert.alert("Browser Error", "Unable to launch the external web browser.");
              }
            }}
            onClose={() => setVisible(false)}
            onViewDetails={() => {
              setVisible(false);
              router.push('/tabs'); 
            }}
          />
        </View>
      </Modal>

      {/* --- IN-APP THREAT REPORT MODAL FOR INTERCEPTOR --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isReportModalVisible}
        onRequestClose={() => setIsReportModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.reportCard}>
            <View style={styles.reportHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.reportBadgeIcon}>
                  <Ionicons name="flag" size={18} color="#EF4444" />
                </View>
                <View>
                  <Text style={styles.reportTitle}>Report Link to C-SEC</Text>
                  <Text style={styles.reportSub}>Threat Intelligence Triage</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIsReportModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
              <View style={styles.urlBox}>
                <Text style={styles.urlBoxLabel}>TARGET URL</Text>
                <Text style={styles.urlBoxText} numberOfLines={2}>{url}</Text>
              </View>

              <Text style={styles.sectionHeader}>SELECT REASON</Text>
              {reportReasons.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.reasonOption,
                    reportReason === opt.id && styles.reasonOptionActive
                  ]}
                  onPress={() => setReportReason(opt.id)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.radioCircle,
                    reportReason === opt.id && styles.radioCircleActive
                  ]}>
                    {reportReason === opt.id && <View style={styles.radioDot} />}
                  </View>
                  <Text style={[
                    styles.reasonText,
                    reportReason === opt.id && styles.reasonTextActive
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}

              <Text style={[styles.sectionHeader, { marginTop: 14 }]}>ADDITIONAL CONTEXT (OPTIONAL)</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Describe details (e.g., impersonates bank, stolen credential form)..."
                placeholderTextColor="#94A3B8"
                value={reportNotes}
                onChangeText={setReportNotes}
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={styles.reportActionRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsReportModalVisible(false)}
                disabled={isSubmittingReport}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmitReport}
                disabled={isSubmittingReport}
              >
                {isSubmittingReport ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.submitBtnText}>Submit Report</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- IN-APP FEEDBACK MODAL (NO ALERT) --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={!!feedbackModal?.visible}
        onRequestClose={() => setFeedbackModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.feedbackCard}>
            <View style={[
              styles.feedbackIconCircle,
              { backgroundColor: feedbackModal?.type === 'success' ? '#DCFCE7' : '#FEE2E2' }
            ]}>
              <Ionicons
                name={feedbackModal?.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
                size={34}
                color={feedbackModal?.type === 'success' ? '#16A34A' : '#DC2626'}
              />
            </View>
            <Text style={styles.feedbackTitle}>{feedbackModal?.title}</Text>
            <Text style={styles.feedbackMessage}>{feedbackModal?.message}</Text>
            {feedbackModal?.reportCount && feedbackModal.reportCount > 1 ? (
              <View style={styles.escalationPill}>
                <Ionicons name="flame" size={14} color="#EA580C" />
                <Text style={styles.escalationText}>Priority Boosted: Reported {feedbackModal.reportCount} times</Text>
              </View>
            ) : null}
            <TouchableOpacity
              style={styles.feedbackOkBtn}
              onPress={() => setFeedbackModal(null)}
            >
              <Text style={styles.feedbackOkBtnText}>Understood</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
});

LinkInterceptor.displayName = 'LinkInterceptor';

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'center', alignItems: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  reportCard: { backgroundColor: '#1E293B', width: '100%', maxWidth: 440, borderRadius: 28, padding: 22, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  reportBadgeIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(239, 68, 68, 0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  reportTitle: { fontSize: 17, fontWeight: '800', color: '#F8FAFC' },
  reportSub: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  closeBtn: { padding: 6, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)' },
  urlBox: { backgroundColor: '#0F172A', padding: 12, borderRadius: 14, marginBottom: 14 },
  urlBoxLabel: { fontSize: 10, fontWeight: '800', color: '#64748B', letterSpacing: 0.5, marginBottom: 4 },
  urlBoxText: { fontSize: 13, color: '#38BDF8', fontWeight: '600' },
  sectionHeader: { fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.5, marginBottom: 8 },
  reasonOption: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, backgroundColor: '#0F172A', marginBottom: 8, borderWidth: 1, borderColor: 'transparent' },
  reasonOptionActive: { borderColor: '#38BDF8', backgroundColor: 'rgba(56, 189, 248, 0.1)' },
  radioCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#64748B', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  radioCircleActive: { borderColor: '#38BDF8' },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#38BDF8' },
  reasonText: { fontSize: 13, color: '#94A3B8', fontWeight: '600' },
  reasonTextActive: { color: '#F8FAFC', fontWeight: '700' },
  notesInput: { backgroundColor: '#0F172A', borderRadius: 14, padding: 12, color: '#F8FAFC', fontSize: 13, minHeight: 70, textAlignVertical: 'top' },
  reportActionRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center' },
  cancelBtnText: { color: '#94A3B8', fontWeight: '700', fontSize: 13 },
  submitBtn: { flex: 1.6, flexDirection: 'row', paddingVertical: 14, borderRadius: 18, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  feedbackCard: { backgroundColor: '#1E293B', width: '90%', maxWidth: 360, borderRadius: 28, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  feedbackIconCircle: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  feedbackTitle: { fontSize: 18, fontWeight: '800', color: '#F8FAFC', marginBottom: 8, textAlign: 'center' },
  feedbackMessage: { fontSize: 13, color: '#94A3B8', lineHeight: 18, textAlign: 'center', marginBottom: 16 },
  escalationPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEDD5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, marginBottom: 16, gap: 5 },
  escalationText: { color: '#C2410C', fontSize: 11, fontWeight: '700' },
  feedbackOkBtn: { width: '100%', paddingVertical: 14, borderRadius: 18, backgroundColor: '#38BDF8', alignItems: 'center' },
  feedbackOkBtnText: { color: '#0F172A', fontWeight: '800', fontSize: 14 }
});

export default LinkInterceptor;