import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

export type HistoryItem = {
  id: string;
  date: string;
  url: string;
  verdict: string;
  protocol: string;
  confidence: string;
  summary: string;
  technicalDetails: string;
  sentinelAnalysis?: string;
};

interface HistoryModalProps {
  visible: boolean;
  onClose: () => void;
  selectedItem: HistoryItem | null;
}

export default function HistoryModal({ visible, onClose, selectedItem }: HistoryModalProps) {
  const { isDark } = useTheme();

  const cardColor = isDark ? '#1A242E' : '#FFFFFF';
  const textColorPrimary = isDark ? '#FFFFFF' : '#1E3246';
  const textColorSecondary = isDark ? '#A9B4C0' : '#8A9AA9';
  const dividerColor = isDark ? '#2D4356' : '#F2F0E4';

  const redAccent = '#EF4444';
  const greenAccent = '#10B981';
  const yellowAccent = '#F59E0B';

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

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          activeOpacity={1} 
          onPress={onClose} 
        />

        <View style={[styles.modalContent, { backgroundColor: cardColor, borderColor: dividerColor }]}>
          
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="shield-search" size={24} color={textColorPrimary} style={{ marginRight: 8 }} />
              <Text style={[styles.modalTitle, { color: textColorPrimary }]}>Scan Details</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={24} color={textColorSecondary} />
            </TouchableOpacity>
          </View>

          {selectedItem && (
            <ScrollView 
              style={styles.modalScrollBody} 
              showsVerticalScrollIndicator={false} 
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              <View style={styles.modalBodyInner}>
                
                <View style={styles.modalRowGroup}>
                  <View style={styles.modalDataRowVertical}>
                    <Text style={[styles.modalLabel, { color: textColorSecondary }]}>Scan ID</Text>
                    <Text style={[styles.modalValue, { color: textColorPrimary, marginTop: 4 }]}>{selectedItem?.id}</Text>
                  </View>
                  <View style={styles.modalDataRowVertical}>
                    <Text style={[styles.modalLabel, { color: textColorSecondary }]}>Date Logged</Text>
                    <Text style={[styles.modalValue, { color: textColorPrimary, marginTop: 4 }]}>{selectedItem?.date}</Text>
                  </View>
                </View>

                <View style={styles.modalDataRowVertical}>
                  <Text style={[styles.modalLabel, { color: textColorSecondary }]}>Target URL</Text>
                  <Text style={[styles.modalValue, { color: textColorPrimary, marginTop: 4 }]} selectable={true}>
                    {selectedItem?.url}
                  </Text>
                </View>

                <View style={styles.modalDataRowVertical}>
                  <Text style={[styles.modalLabel, { color: textColorSecondary }]}>List Protocol</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <View style={[styles.statusDot, { backgroundColor: getProtocolColor(selectedItem?.protocol) }]} />
                    <Text style={[styles.modalValue, { color: textColorPrimary }]}>{selectedItem?.protocol}</Text>
                  </View>
                </View>

                <View style={styles.modalDataRowVertical}>
                  <Text style={[styles.modalLabel, { color: textColorSecondary, marginBottom: 8 }]}>Plain English Summary</Text>
                  <View style={[styles.simpleBox, { backgroundColor: isDark ? '#2D4356' : '#F2F0E4' }]}>
                    <MaterialCommunityIcons name="information-outline" size={20} color={textColorPrimary} style={{ marginRight: 10, marginTop: 2 }} />
                    <Text style={[styles.simpleText, { color: textColorPrimary, flex: 1 }]}>{selectedItem?.summary}</Text>
                  </View>
                </View>

                {selectedItem?.sentinelAnalysis && (
                  <View style={styles.modalDataRowVertical}>
                    <Text style={[styles.modalLabel, { color: textColorSecondary, marginBottom: 8 }]}>THE CSEC SENTINEL ANALYSIS</Text>
                    <View style={[
                      styles.techBox, 
                      { backgroundColor: isDark ? '#1A2A3A' : '#E8F4F8', borderLeftColor: '#3B82F6' }
                    ]}>
                      <View style={styles.techBoxHeader}>
                        <MaterialCommunityIcons name="robot-outline" size={16} color="#3B82F6" />
                        <Text style={[styles.techBoxTitle, { color: '#3B82F6' }]}>AI SECURITY EXPERT</Text>
                      </View>
                      <Text style={[styles.techBoxText, { color: isDark ? '#D1D5DB' : '#4B5563', fontStyle: 'italic' }]}>
                        {selectedItem.sentinelAnalysis.split(/(\*\*.*?\*\*)/g).map((part, index) => {
                          if (part.startsWith('**') && part.endsWith('**')) {
                            return <Text key={index} style={{ fontWeight: 'bold' }}>{part.replace(/\*\*/g, '')}</Text>;
                          }
                          return <Text key={index}>{part}</Text>;
                        })}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.modalDataRowVertical}>
                  <Text style={[styles.modalLabel, { color: textColorSecondary }]}>Technical Details</Text>
                  <View style={[styles.verdictBox, { backgroundColor: isDark ? '#121A21' : '#F9F7E8', borderLeftColor: getVerdictColor(selectedItem?.verdict) }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <Feather name="cpu" size={16} color={getVerdictColor(selectedItem?.verdict)} style={{ marginRight: 6 }} />
                      <Text style={[styles.verdictTitle, { color: getVerdictColor(selectedItem?.verdict) }]}>
                        {selectedItem?.verdict === 'Phishing' ? 'MALICIOUS SIGNATURE' : (selectedItem?.verdict === 'Suspicious' ? 'HEURISTIC GREY ZONE' : 'TRUSTED PLATFORM')}
                      </Text>
                    </View>
                    <Text style={[styles.verdictText, { color: textColorPrimary }]}>
                      {selectedItem?.technicalDetails}
                    </Text>

                    <View style={styles.metricsRow}>
                      <View style={[styles.metricBadge, { backgroundColor: isDark ? '#233240' : '#E8EDF2' }]}>
                        <Text style={[styles.metricLabel, { color: textColorSecondary }]}>RF MODEL F1 SCORE</Text>
                        <Text style={[styles.metricValue, { color: textColorPrimary }]}>95%</Text>
                      </View>
                      <View style={[styles.metricBadge, { backgroundColor: isDark ? '#233240' : '#E8EDF2' }]}>
                        <Text style={[styles.metricLabel, { color: textColorSecondary }]}>PHISHING PROBABILITY</Text>
                        <Text style={[styles.metricValue, { color: getVerdictColor(selectedItem?.verdict) }]}>
                          {selectedItem?.confidence}%
                        </Text>
                      </View>
                    </View>

                  </View>
                </View>

              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    flexShrink: 1, 
    width: '100%',
  },
  modalBodyInner: {
    gap: 24, 
  },
  modalRowGroup: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 40,
  },
  modalDataRowVertical: {
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
  techBox: {
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  techBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  techBoxTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  techBoxText: {
    fontSize: 14,
    lineHeight: 22,
  },
  metricsRow: {  
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 16, 
    paddingTop: 16, 
    borderTopWidth: 1, 
    borderTopColor: 'rgba(150, 150, 150, 0.2)' 
  },
  metricBadge: { 
    flex: 1, 
    padding: 10, 
    borderRadius: 8, 
    alignItems: 'center', 
    marginHorizontal: 4 
  },
  metricLabel: { 
    fontSize: 10, 
    fontWeight: '800', 
    letterSpacing: 0.5, 
    marginBottom: 4, 
    textAlign: 'center' 
  },
  metricValue: { 
    fontSize: 16, 
    fontWeight: 'bold' 
  }
});
