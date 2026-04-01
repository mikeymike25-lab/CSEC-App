import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView 
} from 'react-native';
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';

// --- TUNE INTO THE RADIO TOWER ---
import { useTheme } from '../../context/ThemeContext';

export default function DashboardScreen() {
  
  // 1. Grab the dark mode state
  const { isDark } = useTheme();

  // 2. Define the dynamic colors
  const bgColor = isDark ? '#121A21' : '#F9F7E8';
  const cardColor = isDark ? '#1A242E' : '#FFFFFF';
  const textColorPrimary = isDark ? '#FFFFFF' : '#1E3246';
  const textColorSecondary = isDark ? '#A9B4C0' : '#606A75';
  const badgeBg = isDark ? '#2D4356' : '#EAE8D9';
  
  // Accent Colors for the new visual elements
  const greenAccent = '#10B981';
  const blueAccent = '#4DA8DA';
  const redAccent = '#EF4444';

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
              <Text style={styles.metricValue}>96%</Text>
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
            <Text style={[styles.smallStatValue, { color: textColorPrimary }]}>24,892</Text>
            <Text style={[styles.smallStatLabel, { color: textColorSecondary }]}>TOTAL SCANS</Text>
          </View>
          <View style={[styles.smallStatCard, { backgroundColor: cardColor }]}>
            <MaterialCommunityIcons name="shield-check-outline" size={22} color={greenAccent} />
            <Text style={[styles.smallStatValue, { color: textColorPrimary }]}>18,245</Text>
            <Text style={[styles.smallStatLabel, { color: textColorSecondary }]}>SAFE LINKS</Text>
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
  // INCREASED paddingBottom to 140 to clear the bottom navigation bar
  scrollContent: { padding: 24, paddingTop: 10, paddingBottom: 140 },
  
  badgeContainer: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, marginBottom: 20 },
  badgeDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  
  headerTitle: { fontSize: 38, fontWeight: '900', lineHeight: 42, marginBottom: 30, letterSpacing: -0.5 },
  
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

  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  smallStatCard: { flex: 0.48, padding: 20, borderRadius: 24, alignItems: 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  smallStatValue: { fontSize: 24, fontWeight: '900', marginTop: 12, letterSpacing: -0.5 },
  smallStatLabel: { fontSize: 10, fontWeight: '800', marginTop: 4, letterSpacing: 0.5 },

  tipCard: { flexDirection: 'row', padding: 20, borderRadius: 24, marginBottom: 10, alignItems: 'center' },
  tipIconWrapper: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  tipTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 6 },
  tipText: { fontSize: 13, lineHeight: 20, fontWeight: '500', opacity: 0.9 },
});