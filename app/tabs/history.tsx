import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

// Expanded Dummy Data for Navigation
const FULL_HISTORY_DATA = [
  // Blocklist (5 items)
  { id: '01', date: 'Oct 24,\n2023', url: 'secure-bank-login.net', subtitle: 'SUSPICIOUS DOMAIN', type: 'Blocklist' },
  { id: '02', date: 'Oct 24,\n2023', url: 'update-paypal-auth.com', subtitle: 'PHISHING ATTEMPT', type: 'Blocklist' },
  { id: '03', date: 'Oct 23,\n2023', url: 'free-crypto-giveaway.io', subtitle: 'MALWARE DOWNLOAD', type: 'Blocklist' },
  { id: '04', date: 'Oct 21,\n2023', url: 'netflix-billing-error.org', subtitle: 'CREDENTIAL HARVESTING', type: 'Blocklist' },
  { id: '05', date: 'Oct 20,\n2023', url: '192.168.100.45/payload', subtitle: 'MALICIOUS IP', type: 'Blocklist' },
  
  // Whitelist (5 items)
  { id: '06', date: 'Oct 23,\n2023', url: 'github.com/csec-vault', subtitle: 'TRUSTED REPOSITORY', type: 'Whitelist' },
  { id: '07', date: 'Oct 22,\n2023', url: 'portal.internal.corp/hr', subtitle: 'INTRANET NODE', type: 'Whitelist' },
  { id: '08', date: 'Oct 22,\n2023', url: 'aws.amazon.com/console', subtitle: 'VERIFIED SERVICE', type: 'Whitelist' },
  { id: '09', date: 'Oct 21,\n2023', url: 'figma.com/design-system', subtitle: 'TRUSTED PLATFORM', type: 'Whitelist' },
  { id: '10', date: 'Oct 20,\n2023', url: 'mail.google.com', subtitle: 'VERIFIED SERVICE', type: 'Whitelist' },

  // Greylist (5 items)
  { id: '11', date: 'Oct 22,\n2023', url: 'cloud-storage-392.io', subtitle: 'UNKNOWN ORIGIN', type: 'Greylist' },
  { id: '12', date: 'Oct 21,\n2023', url: 'new-startup-beta.co', subtitle: 'UNVERIFIED DOMAIN', type: 'Greylist' },
  { id: '13', date: 'Oct 20,\n2023', url: 'file-share-temp.net/dl', subtitle: 'POTENTIAL RISK', type: 'Greylist' },
  { id: '14', date: 'Oct 19,\n2023', url: 'forum.cyber-sec-news.xyz', subtitle: 'LOW REPUTATION', type: 'Greylist' },
  { id: '15', date: 'Oct 18,\n2023', url: 'api.weather-data-xyz.com', subtitle: 'NEWLY REGISTERED', type: 'Greylist' },
];

export default function HistoryScreen() {
  const [activeFilter, setActiveFilter] = useState('All');
  const filters = ['All', 'Whitelist', 'Blocklist', 'Greylist'];

  // Logic to filter the data based on the selected chip
  const filteredData = activeFilter === 'All' 
    ? FULL_HISTORY_DATA 
    : FULL_HISTORY_DATA.filter(item => item.type === activeFilter);

  return (
    <View style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        
        {/* Header Section */}
        <View style={styles.paddedSection}>
          <Text style={styles.headerTitle}>Link History</Text>
          <Text style={styles.headerSubtitle}>Review and manage your analyzed digital{'\n'}footprints.</Text>
        </View>

        {/* Filter Chips - Full Bleed Horizontal Scroll */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.filterContainer}
          contentContainerStyle={{ paddingHorizontal: 24 }}
        >
          {filters.map((filter) => (
            <TouchableOpacity 
              key={filter} 
              onPress={() => setActiveFilter(filter)}
              style={[
                styles.filterChip, 
                activeFilter === filter && styles.filterChipActive
              ]}
            >
              <Text style={[
                styles.filterText, 
                activeFilter === filter && styles.filterTextActive
              ]}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Dynamic History Table */}
        <View style={styles.paddedSection}>
          <View style={styles.tableCard}>
            {/* Table Header */}
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderText, { width: 35 }]}>#</Text>
              <Text style={[styles.tableHeaderText, { width: 65 }]}>DATE</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>SOURCE / URL</Text>
              <View style={{ width: 24 }} /> {/* Spacer for icon */}
            </View>

            {/* Table Rows */}
            {filteredData.map((item, index) => (
              <TouchableOpacity // Made the whole row clickable for better UX
                key={item.id} 
                style={[
                  styles.tableRow, 
                  index === filteredData.length - 1 && styles.tableRowLast
                ]}
                activeOpacity={0.6}
              >
                <Text style={[styles.rowIdText, { width: 35 }]}>{item.id}</Text>
                <Text style={[styles.rowDateText, { width: 65 }]}>{item.date}</Text>
                
                <View style={{ flex: 1, paddingRight: 8, justifyContent: 'center' }}>
                  <Text style={styles.rowUrlText} numberOfLines={1} ellipsizeMode="tail">
                    {item.url}
                  </Text>
                  <Text style={styles.rowSubtitleText}>{item.subtitle}</Text>
                </View>

                <View style={styles.viewDetailsIcon}>
                  <Feather name="chevron-right" size={20} color="#1E3246" />
                </View>
              </TouchableOpacity>
            ))}

            {/* Empty State Fallback (just in case) */}
            {filteredData.length === 0 && (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: '#8A9AA9' }}>No history found for this category.</Text>
              </View>
            )}
          </View>
        </View>

        {/* Vault Integrity Protocol Card */}
        <View style={styles.paddedSection}>
          <View style={styles.vaultCard}>
            <View style={styles.vaultIconBox}>
              <MaterialCommunityIcons name="lock-check" size={24} color="#A9B4C0" />
            </View>
            
            <Text style={styles.vaultTitle}>Vault Integrity Protocol</Text>
            <Text style={styles.vaultDescription}>
              All Link History data is secured with AES-256 end-to-end encryption. To maintain absolute privacy, the CSEC Vault automatically executes a <Text style={{fontWeight: '700', color: '#FFF'}}>Self-Purge Sequence</Text> every 30 days, permanently removing metadata from our zero-knowledge servers.
            </Text>

            <View style={styles.badgeRow}>
              <View style={styles.vaultBadge}>
                <MaterialCommunityIcons name="shield-check-outline" size={14} color="#A9B4C0" />
                <Text style={styles.vaultBadgeText}>END-TO-END</Text>
              </View>
              <View style={styles.vaultBadge}>
                <MaterialCommunityIcons name="file-document-outline" size={14} color="#A9B4C0" />
                <Text style={styles.vaultBadgeText}>AUTO-PURGE ACTIVE</Text>
              </View>
            </View>
          </View>

          {/* Total Scanned Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Total Scanned</Text>
            <Text style={styles.summaryValue}>1,284</Text>
            
            <View style={styles.summaryFooter}>
              <View style={styles.redDot} />
              <Text style={styles.summaryFooterText}>12 PHISHING ATTEMPTS BLOCKED</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F7E8', 
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 130, 
  },
  paddedSection: {
    paddingHorizontal: 24, // Keeps central items aligned without pushing table off screen
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1E3246',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#606A75',
    marginBottom: 30,
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 30,
  },
  filterChip: {
    backgroundColor: '#EAE8D9',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginRight: 10,
  },
  filterChipActive: {
    backgroundColor: '#1E3246',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#606A75',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  tableCard: {
    backgroundColor: '#FFFFFF', 
    borderRadius: 24,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F0E4',
    marginBottom: 8,
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#606A75',
    letterSpacing: 1,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F0E4',
  },
  tableRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  rowIdText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E3246',
  },
  rowDateText: {
    fontSize: 12,
    color: '#606A75',
    lineHeight: 18,
  },
  rowUrlText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E3246',
    marginBottom: 4,
  },
  rowSubtitleText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#A9B4C0',
    letterSpacing: 0.5,
  },
  viewDetailsIcon: {
    width: 24,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  vaultCard: {
    backgroundColor: '#2D4356', 
    borderRadius: 30,
    padding: 30,
    marginBottom: 20,
  },
  vaultIconBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#3B5266', 
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  vaultTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  vaultDescription: {
    color: '#A9B4C0',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10, 
  },
  vaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B5266',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  vaultBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  summaryCard: {
    backgroundColor: '#F2F0E4', 
    borderRadius: 30,
    padding: 30,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3246',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 48,
    fontWeight: '800',
    color: '#1E3246',
    marginBottom: 16,
  },
  summaryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  redDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F44336', 
    marginRight: 8,
  },
  summaryFooterText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#606A75',
    letterSpacing: 0.5,
  },
});