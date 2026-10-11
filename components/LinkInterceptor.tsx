import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Alert, Linking, Modal, Platform, StyleSheet, View } from 'react-native';
import { getAuth } from 'firebase/auth'; 
import { FlagContent, FlagType } from './FlagModals';
import * as WebBrowser from 'expo-web-browser';

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
  );
});

LinkInterceptor.displayName = 'LinkInterceptor';

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'center', alignItems: 'center' },
});

export default LinkInterceptor;