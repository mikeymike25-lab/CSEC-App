import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity,
  Modal,
  Pressable
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext'; 

// Updated type with simpleSummary
type HistoryItem = {
  id: string;
  date: string;
  url: string;
  subtitle: string;
  type: string;
  details: string;
  simpleSummary: string; 
};

// Updated data with elder-friendly summaries
const FULL_HISTORY_DATA: HistoryItem[] = [
  { 
    id: '01', date: 'Oct 24,\n2023', url: 'secure-bank-login.net', subtitle: 'SUSPICIOUS DOMAIN', type: 'Blocklist', 
    simpleSummary: 'This looks like a fake banking website created recently to trick you into giving away your bank details. Do not log in here.',
    details: 'Random Forest classifier flagged with 94% confidence. Key features triggering the anomaly: high hyphen count (2), unusual TLD (.net for banking), and matching brand-spoofing lexical n-grams.' 
  },
  { 
    id: '02', date: 'Oct 24,\n2023', url: 'update-paypal-auth.com', subtitle: 'PHISHING ATTEMPT', type: 'Blocklist', 
    simpleSummary: 'This link is pretending to be PayPal to steal your password. It is highly dangerous. Do not click or enter your information.',
    details: 'Model detected phishing signatures based on URL structure. Feature importance prioritized: excessive length (22 chars), multiple sensitive keywords ("update", "auth"), and 2 hyphens. Decision tree consensus: 89% malicious.' 
  },
  { 
    id: '03', date: 'Oct 23,\n2023', url: 'free-crypto-giveaway.io', subtitle: 'MALWARE DOWNLOAD', type: 'Blocklist', 
    simpleSummary: 'Opening this link may automatically download a virus that locks your device or steals your files.',
    details: 'Classified as high-risk. Top predictive features: TLD (.io) combined with a high ratio of spam-associated keywords ("free", "crypto"), and abnormal token separation (2 hyphens). 91% threat score.' 
  },
  { 
    id: '04', date: 'Oct 21,\n2023', url: 'netflix-billing-error.org', subtitle: 'CREDENTIAL HARVESTING', type: 'Blocklist', 
    simpleSummary: 'This is a fake Netflix page. Scammers use this to steal your credit card and password by claiming there is a billing error.',
    details: 'High probability phishing. The Random Forest evaluated the brand-name inclusion combined with negative sentiment words ("error", "billing") and the .org TLD mismatch as highly anomalous structural features.' 
  },
  { 
    id: '05', date: 'Oct 20,\n2023', url: '192.168.100.45/payload', subtitle: 'MALICIOUS IP', type: 'Blocklist', 
    simpleSummary: 'This is a direct link to a dangerous file on a hacker\'s computer. It is completely unsafe.',
    details: 'Immediate block. Feature extraction detected an explicit IPv4 address instead of a resolved domain (4 dots, numeric characters), combined with a highly suspicious directory path length ("/" count: 1). 99% threat confidence.' 
  },
  { 
    id: '06', date: 'Oct 23,\n2023', url: 'github.com/csec-vault', subtitle: 'TRUSTED REPOSITORY', type: 'Whitelist', 
    simpleSummary: 'This is a safe, well-known website used by programmers. There is no threat here.',
    details: 'Verified benign. Lexical feature analysis shows standard domain length, zero suspicious subdomains, and trusted base URL pattern. Random Forest consensus: 98% safe.' 
  },
  { 
    id: '07', date: 'Oct 22,\n2023', url: 'portal.internal.corp/hr', subtitle: 'INTRANET NODE', type: 'Whitelist', 
    simpleSummary: 'This is a safe, private network link, usually belonging to a company workplace.',
    details: 'Classified as Safe. Features analyzed: internal domain suffix (.corp), short path depth (1 slash), and absence of special characters (0 semicolons, 0 hyphens, 1 dot).' 
  },
  { 
    id: '08', date: 'Oct 22,\n2023', url: 'aws.amazon.com/console', subtitle: 'VERIFIED SERVICE', type: 'Whitelist', 
    simpleSummary: 'This is a real, completely safe link belonging to Amazon.',
    details: 'Benign categorization. Model recognized the verified subdomain structure (2 dots). Feature weights prioritized the known-good domain baseline and standard path formatting.' 
  },
  { 
    id: '09', date: 'Oct 21,\n2023', url: 'figma.com/design-system', subtitle: 'TRUSTED PLATFORM', type: 'Whitelist', 
    simpleSummary: 'This is a safe, verified website for design tools.',
    details: 'Safe verdict. Lexical analysis found normal character distribution, optimal length, and a single path slash. 0% probability of lexical spoofing based on training data.' 
  },
  { 
    id: '10', date: 'Oct 20,\n2023', url: 'mail.google.com', subtitle: 'VERIFIED SERVICE', type: 'Whitelist', 
    simpleSummary: 'This is the real, official Google Mail website. It is completely safe to use.',
    details: 'Verified Safe. Extracted features including dot count (2), lack of anomalous path parameters, and recognized high-trust structure resulted in a unanimous benign classification by the forest.' 
  },
  { 
    id: '11', date: 'Oct 22,\n2023', url: 'cloud-storage-392.io', subtitle: 'UNKNOWN ORIGIN', type: 'Greylist', 
    simpleSummary: 'This website lets people share files, but it doesn\'t check them for viruses. Be very careful if you download anything from here.',
    details: 'Random Forest confidence mixed (52% malicious). Suspicious features driving variance: use of numerical digits (392) combined with hyphens in the primary domain string. Queued for deeper heuristic analysis.' 
  },
  { 
    id: '12', date: 'Oct 21,\n2023', url: 'new-startup-beta.co', subtitle: 'UNVERIFIED DOMAIN', type: 'Greylist', 
    simpleSummary: 'This is a brand-new website. Because it is so new, we cannot guarantee it is safe yet. Proceed with caution.',
    details: 'Uncertain classification. Features like multiple hyphens (2) and the .co TLD often correlate with newly spun-up phishing sites in our training set, but keyword analysis was benign. Flagged for review.' 
  },
  { 
    id: '13', date: 'Oct 20,\n2023', url: 'file-share-temp.net/dl', subtitle: 'POTENTIAL RISK', type: 'Greylist', 
    simpleSummary: 'This is a temporary link. Scammers often use links like this to send harmful files. It is best to avoid it.',
    details: 'Elevated risk score. Model flagged the combination of temporary keywords ("temp"), structural hyphens, and a short executable-style path ("/dl"). Feature threshold falls squarely into the grey zone.' 
  },
  { 
    id: '14', date: 'Oct 19,\n2023', url: 'forum.cyber-sec-news.xyz', subtitle: 'LOW REPUTATION', type: 'Greylist', 
    simpleSummary: 'This website belongs to a network that has a history of hosting bad links. Be very careful what you click on there.',
    details: 'Model variance detected. The high hyphen count (3) and low-reputation TLD (.xyz) pushed the anomaly score up, but the subdomain structure ("forum.") matches standard benign patterns.' 
  },
  { 
    id: '15', date: 'Oct 18,\n2023', url: 'api.weather-data-xyz.com', subtitle: 'NEWLY REGISTERED', type: 'Greylist', 
    simpleSummary: 'This is a background computer link (often used by apps). It isn\'t necessarily bad, but its security is very weak.',
    details: 'Borderline evaluation. The "api." subdomain is a standard lexical feature, but the presence of generic data keywords and hyphens confused the classifier. Classified as neutral/suspicious with a 48% anomaly score.' 
  },
];

export default function HistoryScreen() {
  const [activeFilter, setActiveFilter] = useState('All');
  
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const filters = ['All', 'Whitelist', 'Blocklist', 'Greylist'];

  const filteredData = activeFilter === 'All' 
    ? FULL_HISTORY_DATA 
    : FULL_HISTORY_DATA.filter(item => item.type === activeFilter);

  const { isDark } = useTheme();

  const bgColor = isDark ? '#121A21' : '#F9F7E8';
  const cardColor = isDark ? '#1A242E' : '#FFFFFF';
  const textColorPrimary = isDark ? '#FFFFFF' : '#1E3246';
  const textColorSecondary = isDark ? '#A9B4C0' : '#8A9AA9';
  const dividerColor = isDark ? '#2D4356' : '#F2F0E4';
  const filterChipColor = isDark ? '#2D4356' : '#EAE8D9';
  const summaryCardColor = isDark ? '#1A242E' : '#F2F0E4';

  const getStatusColor = (type: string) => {
    switch(type) {
      case 'Blocklist': return '#EF4444'; 
      case 'Whitelist': return '#10B981'; 
      case 'Greylist': return '#F59E0B'; 
      default: return textColorSecondary;
    }
  };

  const handleOpenModal = (item: HistoryItem) => {
    setSelectedItem(item);
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setSelectedItem(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.paddedSection}>
          <Text style={[styles.headerTitle, { color: textColorPrimary }]}>Link History</Text>
          <Text style={[styles.headerSubtitle, { color: textColorSecondary }]}>Review and manage your analyzed digital{'\n'}footprints.</Text>
        </View>

        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer} contentContainerStyle={{ paddingHorizontal: 24 }}>
            {filters.map((filter) => (
              <TouchableOpacity 
                key={filter} 
                onPress={() => setActiveFilter(filter)}
                activeOpacity={0.7}
                style={[
                  styles.filterChip, 
                  { backgroundColor: filterChipColor },
                  activeFilter === filter && styles.filterChipActive
                ]}
              >
                <Text style={[styles.filterText, { color: textColorSecondary }, activeFilter === filter && styles.filterTextActive]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.paddedSection}>
          <View style={[styles.tableCard, { backgroundColor: cardColor }]}>
            <View style={[styles.tableHeaderRow, { borderBottomColor: dividerColor }]}>
              <Text style={[styles.tableHeaderText, { width: 35, color: textColorSecondary }]}>#</Text>
              <Text style={[styles.tableHeaderText, { width: 65, color: textColorSecondary }]}>DATE</Text>
              <Text style={[styles.tableHeaderText, { flex: 1, color: textColorSecondary }]}>SOURCE / URL</Text>
              <View style={{ width: 24 }} />
            </View>

            {filteredData.map((item, index) => (
              <TouchableOpacity 
                key={item.id} 
                onPress={() => handleOpenModal(item)}
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
                  <Text style={[styles.rowSubtitleText, { color: getStatusColor(item.type) }]}>
                    {item.subtitle}
                  </Text>
                </View>

                <View style={styles.viewDetailsIcon}>
                  <Feather name="chevron-right" size={20} color={textColorSecondary} />
                </View>
              </TouchableOpacity>
            ))}

            {filteredData.length === 0 && (
              <View style={styles.emptyStateContainer}>
                <Feather name="inbox" size={32} color={textColorSecondary} style={{ marginBottom: 12 }} />
                <Text style={{ color: textColorSecondary, fontSize: 14, fontWeight: '600' }}>No history found</Text>
              </View>
            )}
          </View>
        </View>

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

      {/* --- Detailed Info Modal --- */}
      <Modal visible={isModalVisible} transparent={true} animationType="fade" onRequestClose={handleCloseModal}>
        <Pressable style={styles.modalOverlay} onPress={handleCloseModal}>
          <Pressable style={[styles.modalContent, { backgroundColor: cardColor, borderColor: dividerColor }]} onPress={() => {}}>
            
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons name="shield-search" size={24} color={textColorPrimary} style={{ marginRight: 8 }} />
                <Text style={[styles.modalTitle, { color: textColorPrimary }]}>Scan Details</Text>
              </View>
              <TouchableOpacity onPress={handleCloseModal} style={styles.closeButton}>
                <Feather name="x" size={24} color={textColorSecondary} />
              </TouchableOpacity>
            </View>

            {selectedItem && (
              <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
                <View style={styles.modalBodyInner}>
                  
                  {/* ID & Date - Now stacked vertically so they don't squish */}
                  <View style={styles.modalRowGroup}>
                    <View style={styles.modalDataRowVertical}>
                      <Text style={[styles.modalLabel, { color: textColorSecondary }]}>Scan ID</Text>
                      <Text style={[styles.modalValue, { color: textColorPrimary, marginTop: 4 }]}>#{selectedItem.id}</Text>
                    </View>
                    <View style={styles.modalDataRowVertical}>
                      <Text style={[styles.modalLabel, { color: textColorSecondary }]}>Date Logged</Text>
                      <Text style={[styles.modalValue, { color: textColorPrimary, marginTop: 4 }]}>{selectedItem.date.replace('\n', ' ')}</Text>
                    </View>
                  </View>

                  <View style={styles.modalDataRowVertical}>
                    <Text style={[styles.modalLabel, { color: textColorSecondary }]}>Target URL</Text>
                    <Text style={[styles.modalValue, { color: textColorPrimary, marginTop: 4 }]} selectable={true}>
                      {selectedItem.url}
                    </Text>
                  </View>

                  <View style={styles.modalDataRowVertical}>
                    <Text style={[styles.modalLabel, { color: textColorSecondary }]}>List Protocol</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <View style={[styles.statusDot, { backgroundColor: getStatusColor(selectedItem.type) }]} />
                      <Text style={[styles.modalValue, { color: textColorPrimary }]}>
                        {selectedItem.type}
                      </Text>
                    </View>
                  </View>

                  {/* Plain English Summary - Elder Friendly */}
                  <View style={styles.modalDataRowVertical}>
                    <Text style={[styles.modalLabel, { color: textColorSecondary, marginBottom: 8 }]}>Plain English Summary</Text>
                    <View style={[styles.simpleBox, { backgroundColor: isDark ? '#2D4356' : '#F2F0E4' }]}>
                      <MaterialCommunityIcons name="information-outline" size={20} color={textColorPrimary} style={{ marginRight: 10, marginTop: 2 }} />
                      <Text style={[styles.simpleText, { color: textColorPrimary, flex: 1 }]}>
                        {selectedItem.simpleSummary}
                      </Text>
                    </View>
                  </View>

                  {/* Technical Analysis */}
                  <View style={styles.modalDataRowVertical}>
                    <Text style={[styles.modalLabel, { color: textColorSecondary }]}>Technical Details</Text>
                    <View style={[styles.verdictBox, { backgroundColor: isDark ? '#121A21' : '#F9F7E8', borderLeftColor: getStatusColor(selectedItem.type) }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Feather name="cpu" size={16} color={getStatusColor(selectedItem.type)} style={{ marginRight: 6 }} />
                        <Text style={[styles.verdictTitle, { color: getStatusColor(selectedItem.type) }]}>
                          {selectedItem.subtitle}
                        </Text>
                      </View>
                      <Text style={[styles.verdictText, { color: textColorPrimary }]}>
                        {selectedItem.details}
                      </Text>
                    </View>
                  </View>

                </View>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingTop: 60, paddingBottom: 40 },
  paddedSection: { paddingHorizontal: 24 },
  
  headerTitle: { fontSize: 36, fontWeight: '800', marginBottom: 8, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 16, marginBottom: 24, lineHeight: 24 },
  
  filterContainer: { flexDirection: 'row', marginBottom: 24 },
  filterChip: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 100, marginRight: 10 },
  filterChipActive: { backgroundColor: '#4DA8DA' }, 
  filterText: { fontSize: 14, fontWeight: '600' },
  filterTextActive: { color: '#FFFFFF' },
  
  tableCard: { borderRadius: 24, padding: 20, marginBottom: 30, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12 },
  tableHeaderRow: { flexDirection: 'row', paddingBottom: 16, borderBottomWidth: 1, marginBottom: 8, alignItems: 'center' },
  tableHeaderText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
  tableRowLast: { borderBottomWidth: 0, paddingBottom: 0 },
  rowIdText: { fontSize: 14, fontWeight: '700' },
  rowDateText: { fontSize: 12, lineHeight: 18, fontWeight: '500' },
  rowUrlText: { fontSize: 15, fontWeight: '700', marginBottom: 4, letterSpacing: -0.2 },
  rowSubtitleText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  viewDetailsIcon: { width: 24, alignItems: 'flex-end', justifyContent: 'center' },
  emptyStateContainer: { padding: 40, alignItems: 'center', justifyContent: 'center' },

  vaultCard: { borderRadius: 30, padding: 30, marginBottom: 20 },
  vaultIconBox: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  vaultTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginBottom: 12, letterSpacing: -0.5 },
  vaultDescription: { color: '#A9B4C0', fontSize: 14, lineHeight: 22, marginBottom: 24 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  vaultBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
  vaultBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginLeft: 6 },
  
  summaryCard: { borderRadius: 30, padding: 30, marginBottom: 20 },
  summaryTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  summaryValue: { fontSize: 48, fontWeight: '800', marginBottom: 16, letterSpacing: -1 },
  summaryFooter: { flexDirection: 'row', alignItems: 'center' },
  redDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', marginRight: 8 },
  summaryFooterText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', 
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxHeight: '85%', 
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderWidth: 1,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  closeButton: {
    padding: 4,
    backgroundColor: 'rgba(169, 180, 192, 0.1)', 
    borderRadius: 20,
  },
  modalScrollBody: {
    flexGrow: 0, 
  },
  modalBodyInner: {
    gap: 24, 
  },
  modalRowGroup: {
    flexDirection: 'row',
    justifyContent: 'flex-start', // Prevent stretching across the whole row
    gap: 40, // Space out the vertically stacked Date and ID
  },
  modalDataRowVertical: {
    // Standard vertical flex for inputs
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  modalValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  simpleBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
  },
  simpleText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  verdictBox: {
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  verdictTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  verdictText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '400',
    opacity: 0.8,
  },
});