import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function SafeLinksScreen() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ status: 'safe' | 'danger'; message: string } | null>(null);

  // Mock data for the user's scan history
  const [recentLinks, setRecentLinks] = useState([
    { id: '1', url: 'https://github.com', status: 'safe', date: 'Today, 10:00 AM' },
    { id: '2', url: 'http://secure-bank-update-free.biz', status: 'danger', date: 'Yesterday, 3:15 PM' },
    { id: '3', url: 'https://reactnative.dev', status: 'safe', date: 'Mar 15, 2:30 PM' },
  ]);

  const handleScan = () => {
    if (!url.trim()) return;
    
    Keyboard.dismiss();
    setIsScanning(true);
    setScanResult(null);

    // Simulate C-SEC AI scanning the URL (1.5 second delay)
    setTimeout(() => {
      setIsScanning(false);
      
      // Basic mock logic: flag it if it has suspicious keywords
      const lowerUrl = url.toLowerCase();
      const isSuspicious = lowerUrl.includes('free') || lowerUrl.includes('update') || lowerUrl.includes('biz');
      
      const newResult = {
        status: isSuspicious ? 'danger' as const : 'safe' as const,
        message: isSuspicious 
          ? 'Threat Detected! This link exhibits severe phishing characteristics.' 
          : 'Verified. No known threats found on this domain.'
      };
      
      setScanResult(newResult);

      // Add the new scan to the top of the history list
      setRecentLinks(prev => [
        { id: Date.now().toString(), url, status: newResult.status, date: 'Just now' },
        ...prev
      ]);
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9F7E8" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#2D4356" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Link Scanner</Text>
        <View style={{ width: 24 }} /> {/* Spacer to center title */}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* SCANNER INPUT CARD */}
        <View style={styles.scannerCard}>
          <Text style={styles.cardTitle}>Analyze a new link</Text>
          <Text style={styles.cardSubtitle}>Paste a URL below to run it through the C-SEC threat database.</Text>
          
          <View style={styles.inputContainer}>
            <Ionicons name="link-outline" size={20} color="#888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="https://example.com"
              placeholderTextColor="#A9A9A9"
              autoCapitalize="none"
              keyboardType="url"
              value={url}
              onChangeText={setUrl}
              editable={!isScanning}
            />
          </View>

          <TouchableOpacity 
            style={[styles.scanButton, !url.trim() && styles.scanButtonDisabled]} 
            activeOpacity={0.8} 
            onPress={handleScan}
            disabled={!url.trim() || isScanning}
          >
            {isScanning ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name="scan-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.scanButtonText}>START SCAN</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* DYNAMIC RESULTS CARD */}
        {scanResult && (
          <View style={[
            styles.resultCard, 
            { backgroundColor: scanResult.status === 'safe' ? '#E8F5E9' : '#FFEBEE', 
              borderColor: scanResult.status === 'safe' ? '#4CAF50' : '#cd382a' }
          ]}>
            <View style={styles.resultHeader}>
              <Ionicons 
                name={scanResult.status === 'safe' ? "shield-checkmark" : "warning"} 
                size={28} 
                color={scanResult.status === 'safe' ? '#4CAF50' : '#cd382a'} 
              />
              <Text style={[
                styles.resultTitle, 
                { color: scanResult.status === 'safe' ? '#2E7D32' : '#C62828' }
              ]}>
                {scanResult.status === 'safe' ? 'Safe Link' : 'Malicious Link'}
              </Text>
            </View>
            <Text style={[
              styles.resultMessage, 
              { color: scanResult.status === 'safe' ? '#1B5E20' : '#B71C1C' }
            ]}>
              {scanResult.message}
            </Text>
          </View>
        )}

        {/* HISTORY LIST */}
        <Text style={styles.sectionTitle}>Recent Scans</Text>
        <View style={styles.historyContainer}>
          {recentLinks.map((item) => (
            <View key={item.id} style={styles.historyItem}>
              <View style={[
                styles.statusDot, 
                { backgroundColor: item.status === 'safe' ? '#4CAF50' : '#cd382a' }
              ]} />
              <View style={styles.historyTextContainer}>
                <Text style={styles.historyUrl} numberOfLines={1} ellipsizeMode="tail">
                  {item.url}
                </Text>
                <Text style={styles.historyDate}>{item.date}</Text>
              </View>
              <TouchableOpacity>
                <Ionicons name="copy-outline" size={20} color="#888" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F7E8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D4356',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  scannerCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginTop: 10,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D4356',
    marginBottom: 5,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    height: 55,
    borderRadius: 15,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  scanButton: {
    backgroundColor: '#2D4356',
    height: 55,
    borderRadius: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanButtonDisabled: {
    backgroundColor: '#A0B2C6',
  },
  scanButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  resultCard: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 25,
    borderWidth: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  resultMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D4356',
    marginBottom: 15,
  },
  historyContainer: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  historyTextContainer: {
    flex: 1,
    marginLeft: 15,
    marginRight: 10,
  },
  historyUrl: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  historyDate: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
});