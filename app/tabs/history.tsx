import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import {
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';

import HistoryModal, { HistoryItem } from '../../components/HistoryModal';

export default function HistoryScreen() {
  const [historyData, setHistoryData] = useState<HistoryItem[]>([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const params = useLocalSearchParams();
  const openModalId = params.openModalId as string;

  const filters = ['All', 'Whitelist', 'Blacklist', 'Greylist'];

  const { isDark } = useTheme();

  const bgColor = isDark ? '#121A21' : '#F9F7E8';
  const cardColor = isDark ? '#1A242E' : '#FFFFFF';
  const textColorPrimary = isDark ? '#FFFFFF' : '#1E3246';
  const textColorSecondary = isDark ? '#A9B4C0' : '#8A9AA9';
  const dividerColor = isDark ? '#2D4356' : '#F2F0E4';
  const filterChipColor = isDark ? '#2D4356' : '#EAE8D9';
  const summaryCardColor = isDark ? '#1A242E' : '#F2F0E4';

  const redAccent = '#EF4444';
  const greenAccent = '#10B981';
  const yellowAccent = '#F59E0B';

  const loadHistory = async () => {
    try {
      const storedData = await AsyncStorage.getItem('csec_history');
      if (storedData) {
        const parsed = JSON.parse(storedData);
        // Automatically sanitize any accidental local development URLs
        const sanitized = parsed.filter((item: any) => 
          !item.url?.toLowerCase().includes('localhost') && 
          !item.url?.toLowerCase().includes('127.0.0.1')
        );
        if (sanitized.length !== parsed.length) {
          await AsyncStorage.setItem('csec_history', JSON.stringify(sanitized));
        }
        setHistoryData(sanitized);
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  React.useEffect(() => {
    if (openModalId && historyData.length > 0) {
      const target = historyData.find((item: HistoryItem) => item.id === openModalId);
      if (target) {
        setSelectedItem(target);
        setIsModalVisible(true);
        router.setParams({ openModalId: '' });
      }
    }
  }, [openModalId, historyData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadHistory().then(() => setRefreshing(false));
  }, []);

  // --- THE FIX: Filter by Verdict instead of Protocol ---
  const filteredData = activeFilter === 'All' 
    ? historyData 
    : historyData.filter(item => {
        if (activeFilter === 'Whitelist') return item.verdict === 'Safe';
        if (activeFilter === 'Blacklist') return item.verdict === 'Phishing';
        if (activeFilter === 'Greylist') return item.verdict === 'Suspicious';
        return true;
      });

  const getVerdictColor = (verdict?: string) => {
    if (verdict === 'Phishing') return redAccent;
    if (verdict === 'Suspicious') return yellowAccent;
    return greenAccent;
  };

  const getProtocolColor = (protocol: string = '') => {
    if (protocol.includes('Blacklist')) return redAccent; 
    if (protocol.includes('Whitelist')) return greenAccent; 
    return yellowAccent; 
  };

  const handleOpenModal = (item: HistoryItem) => {
    setSelectedItem(item);
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setSelectedItem(null);
  };

  const totalScanned = historyData.length;
  const totalThreats = historyData.filter(item => item.verdict === 'Phishing').length;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={textColorPrimary} />
        }
      >
        
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
              <Text style={[styles.tableHeaderText, { width: 50, color: textColorSecondary }]}>ID</Text>
              <Text style={[styles.tableHeaderText, { width: 65, color: textColorSecondary }]}>DATE</Text>
              <Text style={[styles.tableHeaderText, { flex: 1, color: textColorSecondary }]}>SOURCE / URL</Text>
              <View style={{ width: 24 }} />
            </View>

            {filteredData.map((item, index) => (
              <TouchableOpacity 
                key={item.id + index} 
                onPress={() => handleOpenModal(item)}
                style={[
                  styles.tableRow, 
                  { borderBottomColor: dividerColor },
                  index === filteredData.length - 1 && styles.tableRowLast
                ]}
                activeOpacity={0.6}
              >
                <Text style={[styles.rowIdText, { width: 50, color: textColorPrimary }]} numberOfLines={1}>{item.id}</Text>
                <Text style={[styles.rowDateText, { width: 65, color: textColorSecondary }]}>{item.date}</Text>
                
                <View style={{ flex: 1, paddingRight: 8, justifyContent: 'center' }}>
                  <Text style={[styles.rowUrlText, { color: textColorPrimary }]} numberOfLines={1} ellipsizeMode="tail">
                    {item.url}
                  </Text>
                  <Text style={[styles.rowSubtitleText, { color: getVerdictColor(item.verdict) }]}>
                    {item.verdict === 'Phishing' ? 'THREAT DETECTED' : (item.verdict === 'Suspicious' ? 'POTENTIAL RISK' : 'VERIFIED SAFE')}
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
          
          <View style={[styles.engineCard, { backgroundColor: isDark ? '#1A242E' : '#2D4356', borderWidth: isDark ? 1 : 0, borderColor: '#2D4356' }]}>
            <View style={[styles.engineIconBox, { backgroundColor: isDark ? '#2D4356' : '#3B5266' }]}>
              <MaterialCommunityIcons name="brain" size={24} color="#A9B4C0" />
            </View>
            <Text style={styles.engineTitle}>Hybrid Detection Engine</Text>
            <Text style={styles.engineDescription}>
              C-SEC utilizes a multi-layered security pipeline. Known threats are blocked instantly via <Text style={{fontWeight: '700', color: '#FFF'}}>List Protocols</Text>, while unknown links undergo deep structural analysis using our <Text style={{fontWeight: '700', color: '#FFF'}}>Random Forest AI</Text> to catch zero-day phishing attempts.
            </Text>
            <View style={styles.badgeRow}>
              <View style={[styles.engineBadge, { backgroundColor: isDark ? '#2D4356' : '#3B5266' }]}>
                <MaterialCommunityIcons name="format-list-checks" size={14} color="#A9B4C0" />
                <Text style={styles.engineBadgeText}>DUAL-LIST FILTER</Text>
              </View>
              <View style={[styles.engineBadge, { backgroundColor: isDark ? '#2D4356' : '#3B5266' }]}>
                <MaterialCommunityIcons name="cpu-64-bit" size={14} color="#A9B4C0" />
                <Text style={styles.engineBadgeText}>95% F1-SCORE AI</Text>
              </View>
            </View>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: summaryCardColor }]}>
            <Text style={[styles.summaryTitle, { color: textColorPrimary }]}>Total Scanned</Text>
            <Text style={[styles.summaryValue, { color: textColorPrimary }]}>{totalScanned}</Text>
            <View style={styles.summaryFooter}>
              <View style={styles.redDot} />
              <Text style={[styles.summaryFooterText, { color: textColorSecondary }]}>
                {totalThreats} PHISHING ATTEMPT{totalThreats !== 1 ? 'S' : ''} BLOCKED
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <HistoryModal 
        visible={isModalVisible}
        onClose={handleCloseModal}
        selectedItem={selectedItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingTop: 60, paddingBottom: 130 },
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

  engineCard: { borderRadius: 30, padding: 30, marginBottom: 20 },
  engineIconBox: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  engineTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginBottom: 12, letterSpacing: -0.5 },
  engineDescription: { color: '#A9B4C0', fontSize: 14, lineHeight: 22, marginBottom: 24 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  engineBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
  engineBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginLeft: 6 },
  
  summaryCard: { borderRadius: 30, padding: 30, marginBottom: 20 },
  summaryTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  summaryValue: { fontSize: 48, fontWeight: '800', marginBottom: 16, letterSpacing: -1 },
  summaryFooter: { flexDirection: 'row', alignItems: 'center' },
  summaryFooterText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  redDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', marginRight: 8 },
});