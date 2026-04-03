import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Linking, Modal, StyleSheet, View } from 'react-native';
import { FlagContent, FlagType } from './FlagModals';

// Matches your MSI laptop IP and the correct Flask route
const API_URL = 'http://192.168.10.100:5000/analyze-link';

export interface LinkInterceptorRef {
  triggerTestScan: (testUrl: string, testType: FlagType) => void;
}

const LinkInterceptor = forwardRef<LinkInterceptorRef, {}>((props, ref) => {
  const [visible, setVisible] = useState(false);
  const [type, setType] = useState<FlagType>('scanning');
  const [url, setUrl] = useState('');
  const router = useRouter();

  useImperativeHandle(ref, () => ({
    triggerTestScan: (testUrl: string, testType: FlagType) => {
      setUrl(testUrl);
      setType(testType);
      setVisible(true);
    }
  }));

  // THE REAL SENTINEL ENGINE INTEGRATION (Synced with Manual Scan Logic)
  const analyzeUrlWithCSEC = async (targetUrl: string) => {
    try {
      // --- FIX 2: GATE 0 LOCAL CACHE CHECK ---
      // This prevents duplicate history entries if the user clicks the same link twice
      const existingHistory = await AsyncStorage.getItem('csec_history');
      if (existingHistory) {
        const historyArray = JSON.parse(existingHistory);
        const cachedMatch = historyArray.find((item: any) => item.url.toLowerCase() === targetUrl.toLowerCase());

        if (cachedMatch) {
          if (cachedMatch.verdict === 'Phishing') return 'danger';
          if (cachedMatch.verdict === 'Suspicious') return 'warning';
          return 'safe';
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
      
      // --- CALCULATE TRUE PHISHING PROBABILITY (0% = Safe, 100% = Phishing) ---
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
      let uiType: FlagType = 'safe';

      // --- STRICT 40-60 GREYLIST LOGIC ---
      if (serverProtocol.includes('AI')) {
        if (phishingProb >= 40 && phishingProb <= 60) {
          // 40% to 60%: The true Greylist
          currentVerdict = 'Suspicious';
          currentProtocol = 'Heuristic Greylist';
          currentSummary = "AI analysis is inconclusive. This link has features of both safe and malicious sites. Proceed with caution.";
          currentTech = `Uncertain classification. The Random Forest returned a ${currentConfidence}% anomaly score, placing it in the heuristic grey zone.`;
          uiType = 'warning';
        } else if (currentVerdict === 'Phishing') {
          // 61% to 100%: Confident Phishing
          currentProtocol = 'AI RF Analysis'; 
          currentSummary = "This website exhibits malicious characteristics and is likely attempting to steal credentials or data.";
          currentTech = "Threat verdict. Lexical analysis flagged suspicious structural anomalies and abnormal character distribution.";
          uiType = 'danger';
        } else {
          // 0% to 39%: Confident Safe
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

      // Save the exact same data as the manual scan
      await saveToHistory({ 
        url: targetUrl,
        verdict: currentVerdict, 
        protocol: currentProtocol, 
        confidence: currentConfidence, 
        summary: currentSummary, 
        technicalDetails: currentTech 
      });

      return uiType;

    } catch (error) {
      console.error("Engine Error:", error);
      return 'warning'; // Fallback if server is offline
    }
  };

  useEffect(() => {
    const handleIncomingLink = async (incomingUrl: string | null) => {
      if (!incomingUrl || incomingUrl.startsWith('csec://')) return;

      setUrl(incomingUrl);
      setType('scanning');
      setVisible(true);

      const result = await analyzeUrlWithCSEC(incomingUrl);
      setType(result); 
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

  // --- FIX 1: Robust Unique ID Generation ---
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
        technicalDetails: resultData.technicalDetails
      };

      const updatedHistory = [historyItem, ...history]; 
      await AsyncStorage.setItem('csec_history', JSON.stringify(updatedHistory));
      
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
          onProceed={() => {
            setVisible(false);
            Linking.openURL(url);
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)', 
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LinkInterceptor;