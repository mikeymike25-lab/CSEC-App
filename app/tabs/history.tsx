import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext'; 

const FULL_HISTORY_DATA = [
  { id: '01', date: 'Oct 24,\n2023', url: 'secure-bank-login.net', subtitle: 'SUSPICIOUS DOMAIN', type: 'Blocklist' },
  { id: '02', date: 'Oct 24,\n2023', url: 'update-paypal-auth.com', subtitle: 'PHISHING ATTEMPT', type: 'Blocklist' },
  { id: '03', date: 'Oct 23,\n2023', url: 'free-crypto-giveaway.io', subtitle: 'MALWARE DOWNLOAD', type: 'Blocklist' },
  { id: '04', date: 'Oct 21,\n2023', url: 'netflix-billing-error.org', subtitle: 'CREDENTIAL HARVESTING', type: 'Blocklist' },
  { id: '05', date: 'Oct 20,\n2023', url: '192.168.100.45/payload', subtitle: 'MALICIOUS IP', type: 'Blocklist' },
  { id: '06', date: 'Oct 23,\n2023', url: 'github.com/csec-vault', subtitle: 'TRUSTED REPOSITORY', type: 'Whitelist' },
  { id: '07', date: 'Oct 22,\n2023', url: 'portal.internal.corp/hr', subtitle: 'INTRANET NODE', type: 'Whitelist' },
  { id: '08', date: 'Oct 22,\n2023', url: 'aws.amazon.com/console', subtitle: 'VERIFIED SERVICE', type: 'Whitelist' },
  { id: '09', date: 'Oct 21,\n2023', url: 'figma.com/design-system', subtitle: 'TRUSTED PLATFORM', type: 'Whitelist' },
  { id: '10', date: 'Oct 20,\n2023', url: 'mail.google.com', subtitle: 'VERIFIED SERVICE', type: 'Whitelist' },
  { id: '11', date: 'Oct 22,\n2023', url: 'cloud-storage-392.io', subtitle: 'UNKNOWN ORIGIN', type: 'Greylist' },
  { id: '12', date: 'Oct 21,\n2023', url: 'new-startup-beta.co', subtitle: 'UNVERIFIED DOMAIN', type: 'Greylist' },
  { id: '13', date: 'Oct 20,\n2023', url: 'file-share-temp.net/dl', subtitle: 'POTENTIAL RISK', type: 'Greylist' },
  { id: '14', date: 'Oct 19,\n2023', url: 'forum.cyber-sec-news.xyz', subtitle: 'LOW REPUTATION', type: 'Greylist' },
  { id: '15', date: 'Oct 18,\n2023', url: 'api.weather-data-xyz.com', subtitle: 'NEWLY REGISTERED', type: 'Greylist' },
];

export default function HistoryScreen() {
  const [activeFilter, setActiveFilter] = useState('All');
  const filters = ['All', 'Whitelist', 'Blocklist', 'Greylist'];

  const filteredData = activeFilter === 'All' 
    ? FULL_HISTORY_DATA 
    : FULL_HISTORY_DATA.filter(item => item.type === activeFilter);

  // 1. Tune in to the context
  const { isDark } = useTheme();

  // 2. Define the dynamic colors
  const bgColor = isDark ? '#121A21' : '#F9F7E8';
  const cardColor = isDark ? '#1A242E' : '#FFFFFF';
  const textColorPrimary = isDark ? '#FFFFFF' : '#1E3246';
  const textColorSecondary = isDark ? '#A9B4C0' : '#8A9AA9';
  const dividerColor = isDark ? '#2D4356' : '#F2F0E4';
  const filterChipColor = isDark ? '#2D4356' : '#EAE8D9';
  const summaryCardColor = isDark ? '#1A242E' : '#F2F0E4';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        
        {/* Header Section */}
        <View style={styles.paddedSection}>
          <Text style={[styles.headerTitle, { color: textColorPrimary }]}>Link History</Text>
          <Text style={[styles.headerSubtitle, { color: textColorSecondary }]}>Review and manage your analyzed digital{'\n'}footprints.</Text>
        </View>

        {/* Filter Chips */}
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
                { backgroundColor: filterChipColor },
                activeFilter === filter && styles.filterChipActive
              ]}
            >
              <Text style={[
                styles.filterText, 
                { color: textColorSecondary },
                activeFilter === filter && styles.filterTextActive
              ]}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Dynamic History Table */}
        <View style={styles.paddedSection}>
          <View style={[styles.tableCard, { backgroundColor: cardColor }]}>
            {/* Table Header */}
            <View style={[styles.tableHeaderRow, { borderBottomColor: dividerColor }]}>
              <Text style={[styles.tableHeaderText, { width: 35, color: textColorSecondary }]}>#</Text>
              <Text style={[styles.tableHeaderText, { width: 65, color: textColorSecondary }]}>DATE</Text>
              <Text style={[styles.tableHeaderText, { flex: 1, color: textColorSecondary }]}>SOURCE / URL</Text>
              <View style={{ width: 24 }} />
            </View>

            {/* Table Rows */}
            {filteredData.map((item, index) => (
              <TouchableOpacity 
                key={item.id} 
                style={[
                  styles.tableRow, 
                  { borderBottomColor: dividerColor },
                  index === filteredData.length - 1 && styles.tableRowLast
                ]}
                activeOpacity={0.6}
              >
                <Text style={[styles.rowIdText, { width: 35, color: textColorPrimary }]}>{item.id}</Text>
                <Text style={[styles.rowDateText, { width: 65, color: textColorSecondary }]}>{item.date}</Text>
                
                <View style={{ flex: 1, paddingRight: 8, justifyContent: 'center' }}>
                  <Text style={[styles.rowUrlText, { color: textColorPrimary }]} numberOfLines={1} ellipsizeMode="tail">
                    {item.url}
                  </Text>
                  <Text style={[styles.rowSubtitleText, { color: textColorSecondary }]}>{item.subtitle}</Text>
                </View>

                <View style={styles.viewDetailsIcon}>
                  <Feather name="chevron-right" size={20} color={textColorSecondary} />
                </View>
              </TouchableOpacity>
            ))}

            {filteredData.length === 0 && (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: textColorSecondary }}>No history found for this category.</Text>
              </View>
            )}
          </View>
        </View>

        {/* Vault Integrity Protocol Card */}
        <View style={styles.paddedSection}>
          <View style={[styles.vaultCard, { backgroundColor: isDark ? '#1A242E' : '#2D4356', borderWidth: isDark ? 1 : 0, borderColor: '#2D4356' }]}>
            <View style={[styles.vaultIconBox, { backgroundColor: isDark ? '#2D4356' : '#3B5266' }]}>
              <MaterialCommunityIcons name="lock-check" size={24} color="#A9B4C0" />
            </View>
            
            <Text style={styles.vaultTitle}>Vault Integrity Protocol</Text>
            <Text style={styles.vaultDescription}>
              All Link History data is secured with AES-256 end-to-end encryption. To maintain absolute privacy, the CSEC Vault automatically executes a <Text style={{fontWeight: '700', color: '#FFF'}}>Self-Purge Sequence</Text> every 30 days.
            </Text>

            <View style={styles.badgeRow}>
              <View style={[styles.vaultBadge, { backgroundColor: isDark ? '#2D4356' : '#3B5266' }]}>
                <MaterialCommunityIcons name="shield-check-outline" size={14} color="#A9B4C0" />
                <Text style={styles.vaultBadgeText}>END-TO-END</Text>
              </View>
              <View style={[styles.vaultBadge, { backgroundColor: isDark ? '#2D4356' : '#3B5266' }]}>
                <MaterialCommunityIcons name="file-document-outline" size={14} color="#A9B4C0" />
                <Text style={styles.vaultBadgeText}>AUTO-PURGE ACTIVE</Text>
              </View>
            </View>
          </View>

          {/* Total Scanned Summary */}
          <View style={[styles.summaryCard, { backgroundColor: summaryCardColor }]}>
            <Text style={[styles.summaryTitle, { color: textColorPrimary }]}>Total Scanned</Text>
            <Text style={[styles.summaryValue, { color: textColorPrimary }]}>1,284</Text>
            
            <View style={styles.summaryFooter}>
              <View style={styles.redDot} />
              <Text style={[styles.summaryFooterText, { color: textColorSecondary }]}>12 PHISHING ATTEMPTS BLOCKED</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingTop: 20, paddingBottom: 130 },
  paddedSection: { paddingHorizontal: 24 },
  headerTitle: { fontSize: 36, fontWeight: '800', marginBottom: 8 },
  headerSubtitle: { fontSize: 16, marginBottom: 30 },
  filterContainer: { flexDirection: 'row', marginBottom: 30 },
  filterChip: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, marginRight: 10 },
  filterChipActive: { backgroundColor: '#4DA8DA' }, // Using a highlight color for active tab in dark mode
  filterText: { fontSize: 14, fontWeight: '600' },
  filterTextActive: { color: '#FFFFFF' },
  tableCard: { borderRadius: 24, padding: 20, marginBottom: 30, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
  tableHeaderRow: { flexDirection: 'row', paddingBottom: 16, borderBottomWidth: 1, marginBottom: 8 },
  tableHeaderText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
  tableRowLast: { borderBottomWidth: 0, paddingBottom: 0 },
  rowIdText: { fontSize: 14, fontWeight: '700' },
  rowDateText: { fontSize: 12, lineHeight: 18 },
  rowUrlText: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  rowSubtitleText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  viewDetailsIcon: { width: 24, alignItems: 'flex-end', justifyContent: 'center' },
  vaultCard: { borderRadius: 30, padding: 30, marginBottom: 20 },
  vaultIconBox: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  vaultTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  vaultDescription: { color: '#A9B4C0', fontSize: 14, lineHeight: 22, marginBottom: 24 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  vaultBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
  vaultBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginLeft: 6 },
  summaryCard: { borderRadius: 30, padding: 30, marginBottom: 20 },
  summaryTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  summaryValue: { fontSize: 48, fontWeight: '800', marginBottom: 16 },
  summaryFooter: { flexDirection: 'row', alignItems: 'center' },
  redDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#F44336', marginRight: 8 },
  summaryFooterText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
});