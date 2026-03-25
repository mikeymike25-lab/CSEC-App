import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity 
} from 'react-native';
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';

export default function DashboardScreen() {
  return (
    <View style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Status Badge */}
        <View style={styles.badgeContainer}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>SENTINEL DEEP ENGINE ACTIVE</Text>
        </View>

        {/* Title */}
        <Text style={styles.headerTitle}>Network{'\n'}Security{'\n'}Overview.</Text>

        {/* Main Status Card */}
        <View style={styles.mainCard}>
          <View style={styles.mainCardHeader}>
            <MaterialCommunityIcons name="shield-check" size={16} color="#A9B4C0" />
            <Text style={styles.mainCardHeaderText}>SYSTEM INTEGRITY STATUS</Text>
          </View>
          <Text style={styles.mainCardTitle}>PRO GUARD</Text>
          <Text style={styles.mainCardSubtitle}>Continuous protection enabled</Text>
          
          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>SYSTEM{'\n'}INTEGRITY</Text>
              <Text style={styles.metricValue}>100%</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>UPTIME</Text>
              <Text style={styles.metricValue}>99.9%</Text>
            </View>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statCard}>
          <View style={styles.statCardHeader}>
            <Feather name="search" size={16} color="#1E3246" />
            <Text style={styles.statCardTitle}>TOTAL SCANS</Text>
          </View>
          <View style={styles.statCardBody}>
            <Text style={styles.statCardValue}>24,892</Text>
            <Text style={[styles.statCardSubValue, { color: '#4CAF50' }]}>+12%</Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statCardHeader}>
            <MaterialCommunityIcons name="shield-check-outline" size={18} color="#4CAF50" />
            <Text style={styles.statCardTitle}>WHITELIST</Text>
          </View>
          <View style={styles.statCardBody}>
            <Text style={styles.statCardValue}>18,245</Text>
            <Text style={styles.statCardSubValue}>SAFE</Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statCardHeader}>
            <MaterialCommunityIcons name="shield-alert-outline" size={18} color="#F44336" />
            <Text style={styles.statCardTitle}>BLOCKLIST</Text>
          </View>
          <View style={styles.statCardBody}>
            <Text style={styles.statCardValue}>1,402</Text>
            <Text style={styles.statCardSubValue}>THREATS</Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statCardHeader}>
            <Ionicons name="warning-outline" size={18} color="#FFC107" />
            <Text style={styles.statCardTitle}>GREYLIST</Text>
          </View>
          <View style={styles.statCardBody}>
            <Text style={styles.statCardValue}>5,245</Text>
            <Text style={styles.statCardSubValue}>REVIEW</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity style={styles.actionButton}>
          <View style={styles.actionIconWrapper}>
            <Ionicons name="shield-outline" size={24} color="#1E3246" />
          </View>
          <View style={styles.actionTextWrapper}>
            <Text style={styles.actionTitle}>Intrusion Audit</Text>
            <Text style={styles.actionSubtitle}>Real-time scan for unauthorized{'\n'}access attempts.</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <View style={styles.actionIconWrapper}>
            <MaterialCommunityIcons name="history" size={24} color="#1E3246" />
          </View>
          <View style={styles.actionTextWrapper}>
            <Text style={styles.actionTitle}>History Log</Text>
            <Text style={styles.actionSubtitle}>View all previous sentinel scan{'\n'}reports.</Text>
          </View>
        </TouchableOpacity>

      </ScrollView>

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity style={styles.fab}>
        <Ionicons name="add" size={30} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F7E8', // Match the cream background
  },
  scrollContent: {
    padding: 24,
    paddingTop: 10,
    paddingBottom: 120, // Extra padding so the bottom nav doesn't cover content
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAE8D9', // Slightly darker cream for badge
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 20,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1E3246',
    marginRight: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#606A75',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 40,
    fontWeight: '800',
    color: '#1E3246',
    lineHeight: 44,
    marginBottom: 30,
  },
  mainCard: {
    backgroundColor: '#1E3246',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  mainCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  mainCardHeaderText: {
    color: '#A9B4C0',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: 1,
  },
  mainCardTitle: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  mainCardSubtitle: {
    color: '#A9B4C0',
    fontSize: 14,
    marginBottom: 24,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricBox: {
    backgroundColor: '#2A4158', // Lighter inner box
    borderRadius: 12,
    padding: 16,
    flex: 0.48,
  },
  metricLabel: {
    color: '#A9B4C0',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  metricValue: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8A9AA9',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  statCardBody: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statCardValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E3246',
    marginRight: 8,
  },
  statCardSubValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A9B4C0',
  },
  actionButton: {
    flexDirection: 'row',
    backgroundColor: '#F2F0E4', // Very light beige/grey
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  actionIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionTextWrapper: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E3246',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#606A75',
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 100, // Hovering right above the universal navigation bar
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1E3246',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});