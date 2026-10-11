import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications'; 
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react'; 
import { DeviceEventEmitter, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// --- FIREBASE IMPORTS ---
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';

// --- TUNE INTO THE RADIO TOWER ---
import { useTheme } from '../../context/ThemeContext';

export default function DashboardScreen() {
  const { isDark } = useTheme();
  const router = useRouter();

  const [recentScan, setRecentScan] = useState<any>(null);
  const [totalScans, setTotalScans] = useState(0);
  
  // State for the Global Broadcast
  const [broadcastMessage, setBroadcastMessage] = useState<string | null>(null);
  const [broadcastTime, setBroadcastTime] = useState<string | null>(null);

  // State for Greeting
  const [userName, setUserName] = useState('Agent'); // Default fallback

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

  // Helper for dynamic greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning,';
    if (hour < 18) return 'Good Afternoon,';
    return 'Good Evening,';
  };

  // Fetch user's first name on load
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user?.displayName) {
        setUserName(user.displayName.split(' ')[0]); 
      }
    });
    return () => unsub();
  }, []);

  // 1. Fetch data from AsyncStorage whenever the Dashboard becomes active or scan finishes
  const loadRecentData = useCallback(async () => {
    try {
      const storedData = await AsyncStorage.getItem('csec_history');
      if (storedData) {
        const history = JSON.parse(storedData);
        setTotalScans(history.length);
        if (history.length > 0) {
          setRecentScan(history[0]); // Grab the newest scan at the top of the list
        } else {
          setRecentScan(null);
        }
      } else {
        setTotalScans(0);
        setRecentScan(null);
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecentData();
    }, [loadRecentData])
  );

  // Instant refresh whenever a scan finishes anywhere in the app
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('CSEC_SCAN_COMPLETED', () => {
      loadRecentData();
    });
    return () => sub.remove();
  }, [loadRecentData]);

  // 2. Real-time listener for the Global Broadcast + Push Notifications
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system', 'config'), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        if (data.activeBroadcast && data.activeBroadcast.trim() !== '') {
          setBroadcastMessage(data.activeBroadcast);

          // Extract and format the timestamp
          if (data.updatedAt) {
            try {
              // Handle both Firestore Timestamp (.toDate()) and ISO string formats
              const dateObj = data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt);
              setBroadcastTime(dateObj.toLocaleString('en-US', {
                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
              }));
            } catch (error) {
              setBroadcastTime(null);
            }
          } else {
            setBroadcastTime(null);
          }

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
          setBroadcastTime(null);
        }
      }
    }, (error) => {
      console.warn("Dashboard Config Read Error:", error.code);
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
           <View style={[styles.badgeDot, { backgroundColor: greenAccent }]} />
           <Text style={[styles.badgeText, { color: textColorSecondary }]}>SYSTEM SECURE & ACTIVE</Text>
        </View>

        {/* --- DYNAMIC GREETING & TITLE --- */}
        <View style={{ marginBottom: 24 }}>
          <Text style={[styles.greetingText, { color: textColorSecondary }]}>
            {getGreeting()} {userName}.
          </Text>
          <Text style={[styles.headerTitle, { color: textColorPrimary }]}>Security{'\n'}Dashboard.</Text>
        </View>

        {/* --- REDESIGNED GLOBAL BROADCAST BANNER --- */}
        {broadcastMessage && (
          <View style={[
            styles.broadcastCard, 
            { 
              backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : '#FFFBEB', 
              borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FEF3C7',
            }
          ]}>
            <View style={styles.broadcastIconContainer}>
               <Ionicons name="alert-circle" size={24} color={yellowAccent} />
            </View>
            <View style={{ flex: 1 }}>
                <View style={styles.broadcastHeader}>
                  <Text style={[styles.broadcastTitle, { color: yellowAccent }]}>SYSTEM ANNOUNCEMENT</Text>
                  {broadcastTime && (
                    <Text style={[styles.broadcastTime, { color: yellowAccent }]}>{broadcastTime}</Text>
                  )}
                </View>
                <Text style={[styles.broadcastText, { color: textColorPrimary }]}>
                  {broadcastMessage}
                </Text>
            </View>
          </View>
        )}

        {/* --- COMPACT STATS GRID (NOW INCLUDING F1 SCORE) --- */}
        <View style={styles.statsGrid}>
          <View style={[styles.smallStatCard, { backgroundColor: cardColor }]}>
             <View style={styles.statIconWrapper}>
                <Feather name="activity" size={18} color={blueAccent} />
             </View>
            <Text style={[styles.smallStatValue, { color: textColorPrimary }]}>{totalScans > 0 ? totalScans : '0'}</Text>
            <Text style={[styles.smallStatLabel, { color: textColorSecondary }]}>TOTAL SCANS</Text>
          </View>

          <View style={[styles.smallStatCard, { backgroundColor: cardColor }]}>
             <View style={styles.statIconWrapper}>
                <MaterialCommunityIcons name="brain" size={18} color={greenAccent} />
             </View>
            <Text style={[styles.smallStatValue, { color: textColorPrimary }]}>95%</Text>
            <Text style={[styles.smallStatLabel, { color: textColorSecondary }]}>RF MODEL F1 SCORE</Text>
          </View>
        </View>

        {/* --- DYNAMIC RECENT INTERCEPTION CARD --- */}
        {recentScan && (
          <View style={{ marginBottom: 32 }}>
            <Text style={[styles.sectionTitle, { color: textColorPrimary }]}>Latest Interception</Text>
            <View style={[styles.recentCard, { backgroundColor: cardColor }]}>
              
              {/* Header */}
              <View style={styles.recentHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.iconCircle, { backgroundColor: getAccentColor(recentScan.verdict) + '20' }]}>
                    <Feather 
                      name={recentScan.verdict === 'Phishing' ? 'alert-triangle' : 'shield'} 
                      size={18} 
                      color={getAccentColor(recentScan.verdict)} 
                    />
                  </View>
                  <Text style={[styles.recentVerdict, { color: getAccentColor(recentScan.verdict) }]}>
                    {recentScan.verdict.toUpperCase()}
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: textColorSecondary, fontWeight: 'bold' }}>{recentScan.date}</Text>
              </View>
              
              {/* Target URL */}
              <Text style={[styles.recentUrl, { color: textColorPrimary }]} selectable={true} numberOfLines={1}>{recentScan.url}</Text>
              
              {/* Expanded Full Details Box */}
              <View style={[styles.detailsBox, { backgroundColor: detailsBg }]}>
                <Text style={[styles.detailsSummary, { color: textColorPrimary }]}>
                  {recentScan.summary}
                </Text>
                <View style={styles.recentMetricsRow}>
                   <View style={styles.recentMetricItem}>
                      <Text style={[styles.recentMetricLabel, { color: textColorSecondary }]}>PHISHING PROBABILITY</Text>
                      <Text style={[styles.recentMetricValue, { color: getAccentColor(recentScan.verdict) }]}>{recentScan.confidence}%</Text>
                   </View>
                   <View style={styles.recentMetricItem}>
                      <Text style={[styles.recentMetricLabel, { color: textColorSecondary }]}>PROTOCOL</Text>
                      <Text style={[styles.recentMetricValue, { color: textColorPrimary }]}>{recentScan.protocol}</Text>
                   </View>
                </View>
              </View>

              {/* Action Footer */}
              <TouchableOpacity 
                style={styles.recentFooter} 
                onPress={() => router.push({ pathname: '/tabs/history', params: { openModalId: recentScan.id } })}
              >
                <Text style={[styles.recentFooterText, { color: textColorSecondary }]}>VIEW FULL LOG</Text>
                <Feather name="arrow-right" size={16} color={textColorSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* --- NEW PHISHING TIPS SECTION --- */}
        <Text style={[styles.sectionTitle, { color: textColorPrimary }]}>Anti-Phishing Tips</Text>
        <View style={[styles.tipCard, { backgroundColor: cardColor }]}>
          <View style={[styles.tipIconWrapper, { backgroundColor: blueAccent + '20' }]}>
            <Ionicons name="shield-checkmark" size={24} color={blueAccent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.tipTitle, { color: textColorPrimary }]}>Check the Sender</Text>
            <Text style={[styles.tipText, { color: textColorSecondary }]}>
              Always verify the sender's email address. Phishers often use addresses that look similar to legitimate ones (e.g., @paypaI.com instead of @paypal.com).
            </Text>
          </View>
        </View>

        <View style={[styles.tipCard, { backgroundColor: cardColor }]}>
          <View style={[styles.tipIconWrapper, { backgroundColor: greenAccent + '20' }]}>
            <MaterialCommunityIcons name="link-lock" size={24} color={greenAccent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.tipTitle, { color: textColorPrimary }]}>Don't Click Suspicious Links</Text>
            <Text style={[styles.tipText, { color: textColorSecondary }]}>
              Hover over links to see the actual URL before clicking. If it looks strange or unexpected, do not click it.
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
  
  badgeContainer: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, marginBottom: 24 },
  badgeDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  
  greetingText: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  headerTitle: { fontSize: 36, fontWeight: '900', lineHeight: 40, letterSpacing: -0.5 },
  
  // --- BROADCAST STYLES REDESIGNED ---
  broadcastCard: { flexDirection: 'row', borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 32, alignItems: 'center' },
  broadcastIconContainer: { marginRight: 16 },
  broadcastHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  broadcastTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  broadcastTime: { fontSize: 9, fontWeight: '700', opacity: 0.7 },
  broadcastText: { fontSize: 13, lineHeight: 18, fontWeight: '500' },

  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16, letterSpacing: -0.5 },
  
  recentCard: { borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  iconCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  recentVerdict: { fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  recentUrl: { fontSize: 16, fontWeight: '600', marginBottom: 16, letterSpacing: -0.5 },
  
  detailsBox: { padding: 16, borderRadius: 12, marginBottom: 16 },
  detailsSummary: { fontSize: 13, fontWeight: '500', lineHeight: 20, marginBottom: 12 },
  recentMetricsRow: { flexDirection: 'row', paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(150,150,150,0.1)' },
  recentMetricItem: { flex: 1 },
  recentMetricLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
  recentMetricValue: { fontSize: 14, fontWeight: '800' },

  recentFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(150,150,150,0.1)', paddingTop: 16 },
  recentFooterText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  smallStatCard: { flex: 0.48, padding: 20, borderRadius: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  statIconWrapper: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(150,150,150,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  smallStatValue: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5, marginBottom: 4 },
  smallStatLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  tipCard: { flexDirection: 'row', padding: 20, borderRadius: 20, marginBottom: 16, alignItems: 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  tipIconWrapper: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  tipTitle: { fontSize: 14, fontWeight: '800', marginBottom: 6 },
  tipText: { fontSize: 12, lineHeight: 18, fontWeight: '500' },
});