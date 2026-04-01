import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// --- FIREBASE IMPORTS ---
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

// --- TUNE INTO THE RADIO TOWER ---
import { useTheme } from '../../context/ThemeContext';

export default function DashboardScreen() {
  const { isDark } = useTheme();

  // --- BROADCAST STATE ---
  const [activeBroadcast, setActiveBroadcast] = useState<string | null>(null);

  // --- DYNAMIC COLORS ---
  const bgColor = isDark ? '#121A21' : '#F9F7E8';
  const cardColor = isDark ? '#1A242E' : '#FFFFFF';
  const textColorPrimary = isDark ? '#FFFFFF' : '#1E3246';
  const textColorSecondary = isDark ? '#A9B4C0' : '#606A75';
  const actionBtnBg = isDark ? '#1A242E' : '#F2F0E4';
  const badgeBg = isDark ? '#2D4356' : '#EAE8D9';

  // --- LISTEN FOR GLOBAL BROADCASTS ---
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system', 'config'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Check if there is a broadcast and it's not empty
        if (data.activeBroadcast && data.activeBroadcast.trim() !== '') {
          setActiveBroadcast(data.activeBroadcast);
        } else {
          setActiveBroadcast(null);
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
        
        {/* --- THE EMERGENCY BROADCAST BANNER --- */}
        {activeBroadcast && (
          <View style={styles.broadcastBanner}>
            <View style={styles.broadcastHeader}>
              <Ionicons name="warning" size={20} color="#FFF" />
              <Text style={styles.broadcastTitle}>SYSTEM OVERRIDE MESSAGE</Text>
            </View>
            <Text style={styles.broadcastText}>{activeBroadcast}</Text>
          </View>
        )}

        {/* Status Badge */}
        <View style={[styles.badgeContainer, { backgroundColor: badgeBg }]}>
          <View style={[styles.badgeDot, { backgroundColor: isDark ? '#4DA8DA' : '#1E3246' }]} />
          <Text style={[styles.badgeText, { color: textColorSecondary }]}>SENTINEL DEEP ENGINE ACTIVE</Text>
        </View>

        {/* Title */}
        <Text style={[styles.headerTitle, { color: textColorPrimary }]}>Network{'\n'}Security{'\n'}Overview.</Text>

        {/* Main Status Card */}
        <View style={[styles.mainCard, isDark && { borderWidth: 1, borderColor: '#2D4356' }]}>
          <View style={styles.mainCardHeader}>
            <MaterialCommunityIcons name="shield-check" size={16} color="#A9B4C0" />
            <Text style={styles.mainCardHeaderText}>SYSTEM INTEGRITY STATUS</Text>
          </View>
          <Text style={styles.mainCardTitle}>PRO GUARD</Text>
          <Text style={styles.mainCardSubtitle}>Continuous protection enabled</Text>
          
          <View style={styles.metricsRow}>
            <View style={[styles.metricBox, { backgroundColor: isDark ? '#121A21' : '#2A4158' }]}>
              <Text style={styles.metricLabel}>SYSTEM{'\n'}INTEGRITY</Text>
              <Text style={styles.metricValue}>100%</Text>
            </View>
            <View style={[styles.metricBox, { backgroundColor: isDark ? '#121A21' : '#2A4158' }]}>
              <Text style={styles.metricLabel}>UPTIME</Text>
              <Text style={styles.metricValue}>99.9%</Text>
            </View>
          </View>
        </View>

        {/* Stats Cards Row */}
        <View style={[styles.statCard, { backgroundColor: cardColor }]}>
          <View style={styles.statCardHeader}>
            <Feather name="search" size={16} color={isDark ? '#4DA8DA' : '#1E3246'} />
            <Text style={[styles.statCardTitle, { color: textColorSecondary }]}>TOTAL SCANS</Text>
          </View>
          <View style={styles.statCardBody}>
            <Text style={[styles.statCardValue, { color: textColorPrimary }]}>24,892</Text>
            <Text style={[styles.statCardSubValue, { color: '#4CAF50' }]}>+12%</Text>
          </View>
        </View>

        <View style={[styles.statCard, { backgroundColor: cardColor }]}>
          <View style={styles.statCardHeader}>
            <MaterialCommunityIcons name="shield-check-outline" size={18} color="#4CAF50" />
            <Text style={[styles.statCardTitle, { color: textColorSecondary }]}>WHITELIST</Text>
          </View>
          <View style={styles.statCardBody}>
            <Text style={[styles.statCardValue, { color: textColorPrimary }]}>18,245</Text>
            <Text style={styles.statCardSubValue}>SAFE</Text>
          </View>
        </View>

        <View style={[styles.statCard, { backgroundColor: cardColor }]}>
          <View style={styles.statCardHeader}>
            <MaterialCommunityIcons name="shield-alert-outline" size={18} color="#F44336" />
            <Text style={[styles.statCardTitle, { color: textColorSecondary }]}>BLOCKLIST</Text>
          </View>
          <View style={styles.statCardBody}>
            <Text style={[styles.statCardValue, { color: textColorPrimary }]}>1,402</Text>
            <Text style={styles.statCardSubValue}>THREATS</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: actionBtnBg }]}>
          <View style={[styles.actionIconWrapper, { backgroundColor: isDark ? '#2D4356' : '#FFF' }]}>
            <Ionicons name="shield-outline" size={24} color={isDark ? '#FFF' : '#1E3246'} />
          </View>
          <View style={styles.actionTextWrapper}>
            <Text style={[styles.actionTitle, { color: textColorPrimary }]}>Intrusion Audit</Text>
            <Text style={[styles.actionSubtitle, { color: textColorSecondary }]}>Real-time scan for unauthorized access attempts.</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, { backgroundColor: actionBtnBg }]}>
          <View style={[styles.actionIconWrapper, { backgroundColor: isDark ? '#2D4356' : '#FFF' }]}>
            <MaterialCommunityIcons name="history" size={24} color={isDark ? '#FFF' : '#1E3246'} />
          </View>
          <View style={styles.actionTextWrapper}>
            <Text style={[styles.actionTitle, { color: textColorPrimary }]}>History Log</Text>
            <Text style={[styles.actionSubtitle, { color: textColorSecondary }]}>View all previous sentinel scan reports.</Text>
          </View>
        </TouchableOpacity>

      </ScrollView>

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: isDark ? '#4DA8DA' : '#1E3246' }]}>
        <Ionicons name="add" size={30} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24, paddingTop: 10, paddingBottom: 120 },
  
  // --- BROADCAST STYLES ---
  broadcastBanner: { backgroundColor: '#EF4444', borderRadius: 16, padding: 20, marginBottom: 25, shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6, borderWidth: 1, borderColor: '#F87171' },
  broadcastHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  broadcastTitle: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 1.5, marginLeft: 8 },
  broadcastText: { color: '#FFF', fontSize: 16, lineHeight: 24, fontWeight: '600' },

  badgeContainer: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, marginBottom: 20 },
  badgeDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  headerTitle: { fontSize: 40, fontWeight: '800', lineHeight: 44, marginBottom: 30 },
  mainCard: { backgroundColor: '#1E3246', borderRadius: 20, padding: 24, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  mainCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  mainCardHeaderText: { color: '#A9B4C0', fontSize: 12, fontWeight: '700', marginLeft: 8, letterSpacing: 1 },
  mainCardTitle: { color: '#FFF', fontSize: 32, fontWeight: 'bold' },
  mainCardSubtitle: { color: '#A9B4C0', fontSize: 14, marginBottom: 24 },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metricBox: { borderRadius: 12, padding: 16, flex: 0.48 },
  metricLabel: { color: '#A9B4C0', fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 },
  metricValue: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  statCard: { borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  statCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  statCardTitle: { fontSize: 12, fontWeight: '700', marginLeft: 8, letterSpacing: 0.5 },
  statCardBody: { flexDirection: 'row', alignItems: 'baseline' },
  statCardValue: { fontSize: 28, fontWeight: '800', marginRight: 8 },
  statCardSubValue: { fontSize: 12, fontWeight: '700' },
  actionButton: { flexDirection: 'row', borderRadius: 16, padding: 20, marginBottom: 16, alignItems: 'center' },
  actionIconWrapper: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  actionTextWrapper: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  actionSubtitle: { fontSize: 13, lineHeight: 18 },
  fab: { position: 'absolute', right: 24, bottom: 100, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 8 },
});