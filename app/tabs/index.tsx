import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications'; 
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react'; 
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// --- FIREBASE IMPORTS ---
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

// --- TUNE INTO THE RADIO TOWER ---
import { useTheme } from '../../context/ThemeContext';

export default function DashboardScreen() {
  const { isDark } = useTheme();
  const router = useRouter();

  // State to hold dynamic history data
  const [recentScan, setRecentScan] = useState<any>(null);
  const [totalScans, setTotalScans] = useState(0);
  
  // State for the Global Broadcast
  const [broadcastMessage, setBroadcastMessage] = useState<string | null>(null);

  // Define dynamic colors
  const bgColor = isDark ? '#121A21' : '#F9F7E8';
  const cardColor = isDark ? '#1A242E' : '#FFFFFF';
  const textColorPrimary = isDark ? '#FFFFFF' : '#1E3246';
  const textColorSecondary = isDark ? '#A9B4C0' : '#606A75';
  const badgeBg = isDark ? '#2D4356' : '#EAE8D9';
  const detailsBg = isDark ? '#121A21' : '#F2F0E4';
  
  const greenAccent = '#10B981';
  const blueAccent = '#4DA8DA';
  const redAccent = '#EF4444';
  const yellowAccent = '#F59E0B';

  // Helper to keep JSX clean
  const getAccentColor = (verdict: string) => {
    if (verdict === 'Phishing') return redAccent;
    if (verdict === 'Suspicious') return yellowAccent;
    return greenAccent;
  };

  // 1. Fetch data from AsyncStorage whenever the Dashboard becomes active
  useFocusEffect(
    useCallback(() => {
      const loadRecentData = async () => {
        try {
          const storedData = await AsyncStorage.getItem('csec_history');
          if (storedData) {
            const history = JSON.parse(storedData);
            setTotalScans(history.length);
            if (history.length > 0) {
              setRecentScan(history[0]); // Grab the newest scan at the top of the list
            }
          }
        } catch (error) {
          console.error("Failed to load dashboard data:", error);
        }
      };
      loadRecentData();
    }, [])
  );

  // 2. Real-time listener for the Global Broadcast + Push Notifications
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system', 'config'), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        if (data.activeBroadcast && data.activeBroadcast.trim() !== '') {
          setBroadcastMessage(data.activeBroadcast);

          try {
            // --- THE FIX: Fetch the last broadcast this phone actually saw ---
            const lastSeenBroadcast = await AsyncStorage.getItem('csec_last_broadcast');

            // Check if this is a BRAND NEW broadcast 
            if (lastSeenBroadcast !== data.activeBroadcast) {
              
              // Immediately save it so we NEVER buzz for this exact message again
              await AsyncStorage.setItem('csec_last_broadcast', data.activeBroadcast);

              // Fetch user's local notification preferences
              const storedPrefs = await AsyncStorage.getItem('csec_notification_prefs');
              const prefs = storedPrefs ? JSON.parse(storedPrefs) : null;
              
              // Only trigger if Master Push is ON and Broadcasts are ON
              if (prefs && prefs.masterPushEnabled && prefs.broadcastsEnabled) {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: "SYSTEM BROADCAST ⚠️",
                    body: data.activeBroadcast,
                    sound: true,
                  },
                  trigger: null, // Send instantly
                });
              }
            }
          } catch (error) {
            console.log("Could not send push notification:", error);
          }
        } else {
          setBroadcastMessage(null); 
        }
      }
    });

    return () => unsub(); // Cleanup listener on unmount
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Status Badge */}
        <View style={[styles.badgeContainer, { backgroundColor: badgeBg }]}>
          <View style={[styles.badgeDot, { backgroundColor: isDark ? blueAccent : '#1E3246' }]} />
          <Text style={[styles.badgeText, { color: textColorSecondary }]}>SENTINEL DEEP ENGINE ACTIVE</Text>
        </View>

        {/* Title */}
        <Text style={[styles.headerTitle, { color: textColorPrimary }]}>Security{'\n'}Command{'\n'}Center.</Text>

        {/* --- GLOBAL BROADCAST BANNER --- */}
        {broadcastMessage && (
          <View style={[
            styles.broadcastCard, 
            { 
              backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : '#FFFBEB', 
              borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FEF3C7',
              borderLeftColor: yellowAccent 
            }
          ]}>
            <View style={styles.broadcastHeader}>
              <Ionicons name="megaphone" size={18} color={yellowAccent} />
              <Text style={[styles.broadcastTitle, { color: yellowAccent }]}>SYSTEM BROADCAST</Text>
            </View>
            <Text style={[styles.broadcastText, { color: textColorPrimary }]}>
              {broadcastMessage}
            </Text>
          </View>
        )}

        {/* --- DYNAMIC RECENT INTERCEPTION CARD --- */}
        {recentScan && (
          <View style={{ marginBottom: 32 }}>
            <Text style={[styles.sectionTitle, { color: textColorPrimary }]}>Latest Interception Alert</Text>
            
            <View style={[styles.recentCard, { backgroundColor: cardColor, borderLeftColor: getAccentColor(recentScan.verdict) }]}>
              
              {/* Header */}
              <View style={styles.recentHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Feather 
                    name={recentScan.verdict === 'Phishing' ? 'shield-off' : 'shield'} 
                    size={18} 
                    color={getAccentColor(recentScan.verdict)} 
                  />
                  <Text style={[styles.recentVerdict, { color: getAccentColor(recentScan.verdict) }]}>
                    {recentScan.verdict === 'Phishing' ? 'THREAT BLOCKED' : (recentScan.verdict === 'Suspicious' ? 'WARNING ISSUED' : 'SAFE LINK VERIFIED')}
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: textColorSecondary, fontWeight: 'bold' }}>{recentScan.date}</Text>
              </View>
              
              {/* Target URL */}
              <Text style={[styles.recentUrl, { color: textColorPrimary }]} selectable={true}>{recentScan.url}</Text>
              
              {/* Expanded Full Details Box */}
              <View style={[styles.detailsBox, { backgroundColor: detailsBg }]}>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={[styles.badgeDot, { backgroundColor: getAccentColor(recentScan.verdict), width: 6, height: 6 }]} />
                  <Text style={[styles.detailsProtocol, { color: textColorSecondary }]}>{recentScan.protocol}</Text>
                </View>
                
                <Text style={[styles.detailsSummary, { color: textColorPrimary }]}>
                  {recentScan.summary}
                </Text>
                
                <Text style={[styles.detailsTech, { color: textColorSecondary }]}>
                  <Text style={{ fontWeight: '700' }}>AI Diagnostics: </Text>{recentScan.technicalDetails}
                </Text>

                {/* Metrics Row Inside Details */}
                <View style={styles.recentMetricsRow}>
                   <View style={styles.recentMetricItem}>
                      <Text style={[styles.recentMetricLabel, { color: textColorSecondary }]}>PHISHING PROBABILITY</Text>
                      <Text style={[styles.recentMetricValue, { color: getAccentColor(recentScan.verdict) }]}>{recentScan.confidence}%</Text>
                   </View>
                   <View style={styles.recentMetricItem}>
                      <Text style={[styles.recentMetricLabel, { color: textColorSecondary }]}>SCAN ID</Text>
                      <Text style={[styles.recentMetricValue, { color: textColorPrimary }]}>{recentScan.id}</Text>
                   </View>
                </View>

              </View>

              {/* Action Footer */}
              <TouchableOpacity style={styles.recentFooter} onPress={() => router.push('/tabs/history')}>
                <Text style={[styles.recentFooterText, { color: textColorSecondary }]}>VIEW FULL HISTORY LOG</Text>
                <Feather name="arrow-right" size={16} color={textColorSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Main Status Card */}
        <View style={[styles.mainCard, isDark && { borderWidth: 1, borderColor: '#2D4356' }]}>
          <View style={styles.mainCardHeader}>
            <MaterialCommunityIcons name="brain" size={16} color="#A9B4C0" />
            <Text style={styles.mainCardHeaderText}>CORE DETECTION ENGINE</Text>
          </View>
          <Text style={styles.mainCardTitle}>SENTINEL AI</Text>
          <Text style={styles.mainCardSubtitle}>Hybrid analysis pipeline active</Text>
          
          <View style={styles.metricsRow}>
            <View style={[styles.metricBox, { backgroundColor: isDark ? '#121A21' : '#2A4158' }]}>
              <Text style={styles.metricLabel}>RF MODEL{'\n'}F1 SCORE</Text>
              <Text style={styles.metricValue}>95%</Text>
            </View>
            <View style={[styles.metricBox, { backgroundColor: isDark ? '#121A21' : '#2A4158' }]}>
              <Text style={styles.metricLabel}>PROTOCOL{'\n'}DATABASES</Text>
              <Text style={styles.metricValue}>SYNCED</Text>
            </View>
          </View>
        </View>

        {/* --- THREAT LANDSCAPE BREAKDOWN --- */}
        <Text style={[styles.sectionTitle, { color: textColorPrimary }]}>Threat Landscape</Text>
        <View style={[styles.landscapeCard, { backgroundColor: cardColor }]}>
          <View style={styles.progressItem}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: textColorSecondary }]}>LEXICAL ANOMALIES</Text>
              <Text style={[styles.progressValue, { color: redAccent }]}>High Risk</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '85%', backgroundColor: redAccent }]} />
            </View>
          </View>
          
          <View style={[styles.progressItem, { marginBottom: 0 }]}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: textColorSecondary }]}>DOMAIN REPUTATION</Text>
              <Text style={[styles.progressValue, { color: greenAccent }]}>Stable</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '25%', backgroundColor: greenAccent }]} />
            </View>
          </View>
        </View>

        {/* --- COMPACT STATS GRID --- */}
        <View style={styles.statsGrid}>
          <View style={[styles.smallStatCard, { backgroundColor: cardColor }]}>
            <Feather name="activity" size={20} color={blueAccent} />
            <Text style={[styles.smallStatValue, { color: textColorPrimary }]}>{totalScans > 0 ? totalScans : '0'}</Text>
            <Text style={[styles.smallStatLabel, { color: textColorSecondary }]}>TOTAL SCANS</Text>
          </View>
          <View style={[styles.smallStatCard, { backgroundColor: cardColor }]}>
            <MaterialCommunityIcons name="shield-check-outline" size={22} color={greenAccent} />
            <Text style={[styles.smallStatValue, { color: textColorPrimary }]}>Active</Text>
            <Text style={[styles.smallStatLabel, { color: textColorSecondary }]}>LIVE MONITORING</Text>
          </View>
        </View>

        {/* --- SENTINEL BRIEFING (Security Tip) --- */}
        <View style={[styles.tipCard, { backgroundColor: isDark ? '#1A242E' : '#E8EDF2', borderWidth: isDark ? 1 : 0, borderColor: '#2D4356' }]}>
          <View style={[styles.tipIconWrapper, { backgroundColor: isDark ? '#2D4356' : '#FFFFFF' }]}>
            <Ionicons name="bulb-outline" size={20} color={blueAccent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.tipTitle, { color: blueAccent }]}>SENTINEL BRIEFING</Text>
            <Text style={[styles.tipText, { color: textColorPrimary }]}>
              Suspicious URLs often use "punycode" to mimic real sites (e.g., googIe.com vs google.com). Always check the spelling.
            </Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24, paddingTop: 10, paddingBottom: 140 },
  
  badgeContainer: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, marginBottom: 20 },
  badgeDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  
  headerTitle: { fontSize: 38, fontWeight: '900', lineHeight: 42, marginBottom: 24, letterSpacing: -0.5 },
  
  // --- BROADCAST STYLES ---
  broadcastCard: { borderWidth: 1, borderLeftWidth: 4, borderRadius: 16, padding: 20, marginBottom: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  broadcastHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  broadcastTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 1.5, marginLeft: 8 },
  broadcastText: { fontSize: 14, lineHeight: 22, fontWeight: '600', opacity: 0.9 },

  mainCard: { backgroundColor: '#1E3246', borderRadius: 24, padding: 24, marginBottom: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
  mainCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  mainCardHeaderText: { color: '#A9B4C0', fontSize: 11, fontWeight: '800', marginLeft: 8, letterSpacing: 1.5 },
  mainCardTitle: { color: '#FFF', fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
  mainCardSubtitle: { color: '#A9B4C0', fontSize: 14, marginBottom: 24, fontWeight: '500' },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metricBox: { borderRadius: 16, padding: 16, flex: 0.48 },
  metricLabel: { color: '#A9B4C0', fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8, lineHeight: 14 },
  metricValue: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16, letterSpacing: -0.5 },
  
  landscapeCard: { borderRadius: 24, padding: 24, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  progressItem: { marginBottom: 20 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  progressValue: { fontSize: 11, fontWeight: '800' },
  progressBarBg: { height: 8, backgroundColor: 'rgba(150,150,150,0.15)', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },

  recentCard: { borderRadius: 20, padding: 20, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  recentVerdict: { fontSize: 12, fontWeight: '900', letterSpacing: 0.5, marginLeft: 8 },
  recentUrl: { fontSize: 18, fontWeight: '700', marginBottom: 16, letterSpacing: -0.5 },
  
  detailsBox: { padding: 16, borderRadius: 16, marginBottom: 16 },
  detailsProtocol: { fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  detailsSummary: { fontSize: 14, fontWeight: '600', lineHeight: 20, marginBottom: 8 },
  detailsTech: { fontSize: 12, fontWeight: '400', lineHeight: 18, opacity: 0.8 },
  recentMetricsRow: { flexDirection: 'row', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(150,150,150,0.1)' },
  recentMetricItem: { flex: 1 },
  recentMetricLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
  recentMetricValue: { fontSize: 16, fontWeight: '900' },

  recentFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(150,150,150,0.1)', paddingTop: 16 },
  recentFooterText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  smallStatCard: { flex: 0.48, padding: 20, borderRadius: 24, alignItems: 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  smallStatValue: { fontSize: 24, fontWeight: '900', marginTop: 12, letterSpacing: -0.5 },
  smallStatLabel: { fontSize: 10, fontWeight: '800', marginTop: 4, letterSpacing: 0.5 },

  tipCard: { flexDirection: 'row', padding: 20, borderRadius: 24, marginBottom: 10, alignItems: 'center' },
  tipIconWrapper: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  tipTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 6 },
  tipText: { fontSize: 13, lineHeight: 20, fontWeight: '500', opacity: 0.9 },
});