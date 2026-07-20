import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Linking, Modal, StyleSheet, View } from 'react-native';
import { getAuth } from 'firebase/auth'; 
import { FlagContent, FlagType } from './FlagModals';
import * as WebBrowser from 'expo-web-browser';

const API_URL = process.env.EXPO_PUBLIC_API_URL 
  ? `${process.env.EXPO_PUBLIC_API_URL}/analyze-link` 
  : 'http://localhost:5000/analyze-link';

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

      // --- GATE 0: LOCAL CACHE CHECK ---
      const existingHistory = await AsyncStorage.getItem('csec_history');
      if (existingHistory) {
        const historyArray = JSON.parse(existingHistory);
        const cachedMatch = historyArray.find((item: any) => item.url.toLowerCase() === targetUrl.toLowerCase());

        if (cachedMatch) {
          let cachedType: FlagType = 'safe';
          if (cachedMatch.verdict === 'Phishing') cachedType = 'danger';
          if (cachedMatch.verdict === 'Suspicious') cachedType = 'warning';
          
          // Return the cached flag!
          return { type: cachedType, cached: true, proto: cachedMatch.protocol, summary: cachedMatch.summary, technicalDetails: cachedMatch.technicalDetails, sentinelAnalysis: cachedMatch.sentinelAnalysis };
        }
      }

      // --- GATE 1, 2, 3: SERVER FETCH ---
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
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
    const handleIncomingLink = async (incomingUrl: string | null) => {
      // Ignore empty links or internal app links
      if (!incomingUrl || incomingUrl.startsWith('csec://') || incomingUrl.startsWith('exp://')) return;

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
        url: resultData.url,
        verdict: resultData.verdict,
        protocol: resultData.protocol,
        confidence: resultData.confidence,
        summary: resultData.summary,
        technicalDetails: resultData.technicalDetails,
        sentinelAnalysis: resultData.sentinelAnalysis
      };

      const updatedHistory = [historyItem, ...history]; 
      await AsyncStorage.setItem('csec_history', JSON.stringify(updatedHistory));
      
      // Update home screen widget
      try {
        const { updateWidget } = require('../widget/WidgetTaskHandler');
        updateWidget();
      } catch (err) {
        console.error("Widget Update Failed:", err);
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
            await WebBrowser.openBrowserAsync(url);
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

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'center', alignItems: 'center' },
});

export default LinkInterceptor;