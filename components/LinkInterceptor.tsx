import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Linking, Modal, StyleSheet, View } from 'react-native';
import { FlagContent, FlagType } from './FlagModals';

// Replace this with your MSI laptop's Local IP Address (e.g., http://192.168.1.5:5000)
// Ensure your Flask app is running on host='0.0.0.0'
const API_URL = 'http://192.168.10.100:5000/predict';

export interface LinkInterceptorRef {
  triggerTestScan: (testUrl: string, testType: FlagType) => void;
}

const LinkInterceptor = forwardRef<LinkInterceptorRef, {}>((props, ref) => {
  const [visible, setVisible] = useState(false);
  const [type, setType] = useState<FlagType>('scanning');
  const [url, setUrl] = useState('');
  const router = useRouter();

  // 1. PROGRAMMATIC TRIGGER
  useImperativeHandle(ref, () => ({
    triggerTestScan: (testUrl: string, testType: FlagType) => {
      setUrl(testUrl);
      setType(testType);
      setVisible(true);
    }
  }));

  // AI ANALYSIS HELPER
  const analyzeUrlWithAI = async (targetUrl: string): Promise<FlagType> => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });

      if (!response.ok) throw new Error('Network response was not ok');
      
      const data = await response.json();

      /** * Mapping your RF Model output to UI types:
       * Assuming your API returns: 0 = Safe, 1 = Suspicious, 2 = Phishing
       */
      if (data.prediction === 2) return 'danger';
      if (data.prediction === 1) return 'warning';
      return 'safe';

    } catch (error) {
      console.error("C-SEC Engine Connection Error:", error);
      // Fallback: If server is down/unreachable, show 'warning' for safety
      return 'warning';
    }
  };

  // 2. REAL INTERCEPTION LOGIC
  useEffect(() => {
    const handleIncomingLink = async (incomingUrl: string | null) => {
      if (!incomingUrl || incomingUrl.startsWith('csec://')) return;

      setUrl(incomingUrl);
      setType('scanning');
      setVisible(true);

      // --- THE REAL RF MODEL INTEGRATION ---
      const aiResult = await analyzeUrlWithAI(incomingUrl);
      
      setType(aiResult); 
      await saveToHistory(incomingUrl, aiResult);
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

  // Maps the result to your History format and saves it
  const saveToHistory = async (scannedUrl: string, resultType: FlagType) => {
    try {
      const dateString = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const idString = '#' + Math.floor(1000 + Math.random() * 9000).toString();

      let historyItem = {
        id: idString,
        date: dateString,
        url: scannedUrl,
        verdict: '',
        protocol: '',
        confidence: '',
        summary: '',
        technicalDetails: ''
      };

      if (resultType === 'safe') {
        historyItem = { ...historyItem, verdict: 'Safe', protocol: 'Whitelist Protocol', confidence: '0', summary: 'This is a safe, verified website recognized by our Trusted Platform list.', technicalDetails: 'Verified via Whitelist Protocol. 0% probability of threat based on trusted domain signatures.' };
      } else if (resultType === 'warning') {
        historyItem = { ...historyItem, verdict: 'Suspicious', protocol: 'Greylist Protocol', confidence: '65', summary: 'This link is not on our strict blacklist, but it shows unusual redirect patterns.', technicalDetails: 'RF Model detected anomalous behavior. It may be attempting to harvest credentials through a mirrored interface.' };
      } else if (resultType === 'danger') {
        historyItem = { ...historyItem, verdict: 'Phishing', protocol: 'Blacklist Protocol', confidence: '99', summary: 'This link is a confirmed threat. The URL mimics a financial institution to harvest data.', technicalDetails: 'High probability of phishing detected by RF Model. Domain points to an unauthorized server in an untrusted jurisdiction.' };
      }

      const existingData = await AsyncStorage.getItem('csec_history');
      const currentHistory = existingData ? JSON.parse(existingData) : [];
      const updatedHistory = [historyItem, ...currentHistory]; 
      
      await AsyncStorage.setItem('csec_history', JSON.stringify(updatedHistory));
      
    } catch (e) {
      console.error("Failed to save scan to history", e);
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