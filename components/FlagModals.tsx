import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';

export type FlagType = 'scanning' | 'safe' | 'warning' | 'danger' | 'unverified';

interface FlagProps {
  type: FlagType;
  url: string;
  isCached?: boolean;          // NEW
  protocol?: string;           // NEW
  summary?: string;
  technicalDetails?: string;
  sentinelAnalysis?: string;
  onProceed: () => void;
  onClose: () => void;
  onViewDetails: () => void;
}

export const FlagContent: React.FC<FlagProps> = ({ type, url, isCached, protocol, summary, technicalDetails, sentinelAnalysis, onProceed, onClose, onViewDetails }) => {
  const isDarkMode = useColorScheme() === 'dark';

  const theme = {
    cardBg: isDarkMode ? '#1E293B' : '#FFFFFF',          
    titleText: isDarkMode ? '#F8FAFC' : '#1E293B',        
    descText: isDarkMode ? '#CBD5E1' : '#475569',         
    boxBg: isDarkMode ? '#334155' : '#F8F6F4',            
    secondaryBtnBg: isDarkMode ? '#334155' : '#EAE8E3',   
    secondaryBtnText: isDarkMode ? '#F8FAFC' : '#1E293B', 
    tertiaryText: isDarkMode ? '#94A3B8' : '#64748B',     
  };

  // Helper functions to generate dynamic text based on Cache/List Filtering
  const getTitleText = () => {
    if (isCached) {
      if (type === 'danger') return 'Threat (Cached)';
      if (type === 'warning') return 'Potential Risk (Cached)';
      return 'Safe (Cached)';
    }
    if (type === 'danger') return 'Threat';
    if (type === 'warning') return 'Potential Risk';
    if (type === 'safe') return 'Safe';
    return '';
  };

  const getLabelText = () => {
    if (isCached) return 'LOCAL CACHE MATCH';
    if (protocol?.includes('Blacklist')) return 'GLOBAL BLACKLIST';
    if (protocol?.includes('Whitelist')) return 'TRUSTED WHITELIST';
    return 'AI VERDICT';
  };

  if (type === 'scanning') {
    return (
      <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
        <ActivityIndicator size="large" color={isDarkMode ? '#38BDF8' : '#2A3B4C'} style={{ marginBottom: 20 }} />
        <Text style={[styles.title, { color: theme.titleText }]}>Analyzing Link...</Text>
        <Text style={[styles.verdictDesc, { color: theme.descText, textAlign: 'center' }]}>C-SEC Engine is scanning for threats.</Text>
      </View>
    );
  }

  if (type === 'unverified') {
    return (
      <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
        <View style={styles.iconContainer}>
          <View style={[styles.iconCircle, { backgroundColor: '#EF4444' }]}>
            <MaterialCommunityIcons name="shield-lock-outline" size={32} color="white" />
          </View>
        </View>
        <Text style={[styles.title, { color: theme.titleText }]}>Verification Required</Text>
        <Text style={[styles.verdictDesc, { color: theme.descText, textAlign: 'center', marginBottom: 20 }]}>
          Your account must be verified to perform heuristic URL scanning. Please verify your email to unlock link interception.
        </Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.primaryBtn} onPress={onViewDetails}>
            <Text style={styles.primaryBtnText}>OPEN APP TO VERIFY</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tertiaryBtn} onPress={onClose}>
            <Text style={[styles.tertiaryBtnText, { color: theme.tertiaryText }]}>CLOSE & IGNORE</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
      
      <View style={styles.iconContainer}>
        {type === 'safe' && (
          <View style={[styles.iconCircle, { backgroundColor: '#22C55E' }]}>
            <Ionicons name="checkmark" size={32} color="white" />
          </View>
        )}
        {type === 'warning' && (
          <View style={[styles.iconCircle, { backgroundColor: '#FDBA74', borderRadius: 12 }]}>
            <Ionicons name="warning" size={28} color="#7C2D12" />
          </View>
        )}
        {type === 'danger' && (
          <View style={styles.dangerIconWrapper}>
            <View style={[styles.iconCircle, { backgroundColor: '#2A3B4C' }]}>
              <Ionicons name="shield" size={24} color="#EF4444" />
            </View>
            <View style={styles.dangerBadgeIndicator}>
              <Text style={{color: 'white', fontSize: 10, fontWeight: 'bold'}}>!</Text>
            </View>
          </View>
        )}
      </View>

      {/* DYNAMIC TITLE (Cached, List, or AI) */}
      <Text style={[styles.title, { color: theme.titleText, textAlign: 'center' }]}>
        {getTitleText()}
      </Text>
      
      {type === 'danger' && (
        <View style={styles.criticalAlertBadge}>
          <Ionicons name="shield-half" size={12} color="#EF4444" />
          <Text style={styles.criticalAlertText}>CRITICAL ALERT</Text>
        </View>
      )}

      <View style={[styles.verdictBox, { backgroundColor: theme.boxBg }]}>
        <View style={styles.verdictHeader}>
          {type === 'safe' && <Ionicons name="shield-checkmark" size={16} color="#22C55E" />}
          {type === 'warning' && <MaterialCommunityIcons name="robot-outline" size={18} color="#F59E0B" />}
          
          {type === 'danger' ? (
            <View style={styles.dangerVerdictLabel}>
              <Text style={styles.dangerVerdictLabelText}>{getLabelText()}</Text>
            </View>
          ) : (
            <Text style={[styles.verdictLabel, { color: theme.tertiaryText }]}>{getLabelText()}</Text>
          )}
        </View>
        
        {/* DYNAMIC DESCRIPTIONS BASED ON PROTOCOL */}
        <Text style={[styles.verdictDesc, { color: theme.descText }]}>
          {summary || (
            type === 'safe' 
            ? (protocol?.includes('Whitelist') ? 'This is a safe, verified website recognized by our Trusted Platform list.' : 'This link matches known secure patterns based on structural analysis.')
            : type === 'warning' ? 'This link shows unusual redirect patterns and falls into the heuristic greylist.'
            : (protocol?.includes('Blacklist') ? 'This URL is found in our Global Blacklist Database of known malicious actors.' : <Text><Text style={{ fontWeight: 'bold', color: theme.titleText }}>High probability of phishing. </Text>The URL structure mimics a financial institution but points to an unauthorized server.</Text>)
          )}
        </Text>

        {sentinelAnalysis && (
          <View style={{ marginTop: 24, marginBottom: 8 }}>
            <Text style={[styles.sectionLabel, { color: theme.tertiaryText }]}>THE CSEC SENTINEL ANALYSIS</Text>
            <View style={[
              styles.techBox, 
              { backgroundColor: isDarkMode ? '#1A2A3A' : '#E8F4F8', borderLeftColor: '#3B82F6' }
            ]}>
              <View style={styles.techBoxHeader}>
                <MaterialCommunityIcons name="robot-outline" size={16} color="#3B82F6" />
                <Text style={[styles.techBoxTitle, { color: '#3B82F6' }]}>AI SECURITY EXPERT</Text>
              </View>
              <ScrollView style={{ maxHeight: 120 }} nestedScrollEnabled={true}>
                <Text style={[styles.techBoxText, { color: isDarkMode ? '#D1D5DB' : '#4B5563', fontStyle: 'italic' }]}>
                  {sentinelAnalysis.split(/(\*\*.*?\*\*)/g).map((part, index) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                      return <Text key={index} style={{ fontWeight: 'bold' }}>{part.replace(/\*\*/g, '')}</Text>;
                    }
                    return <Text key={index}>{part}</Text>;
                  })}
                </Text>
              </ScrollView>
            </View>
          </View>
        )}

        {technicalDetails && (
          <Text style={[styles.verdictDesc, { color: theme.descText, marginTop: 12, opacity: 0.8, fontSize: 12 }]}>
            {technicalDetails}
          </Text>
        )}
      </View>

      <View style={styles.buttonContainer}>
        {type === 'safe' && (
          <>
            <TouchableOpacity style={styles.primaryBtn} onPress={onProceed}>
              <Text style={styles.primaryBtnText}>PROCEED</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryBtn, { backgroundColor: theme.secondaryBtnBg }]} onPress={onViewDetails}>
              <Text style={[styles.secondaryBtnText, { color: theme.secondaryBtnText }]}>VIEW IN CSEC APP</Text>
            </TouchableOpacity>
            <View style={styles.footerRow}>
              <Ionicons name="shield-checkmark-outline" size={12} color={theme.tertiaryText} />
              <Text style={[styles.footerText, { color: theme.tertiaryText }]}>Verified by Digital Vault Security Cloud</Text>
            </View>
          </>
        )}

        {type === 'warning' && (
          <>
            <TouchableOpacity style={styles.primaryBtn} onPress={onViewDetails}>
              <Text style={styles.primaryBtnText}>CHECK DETAILS IN CSEC</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryBtn, { backgroundColor: theme.secondaryBtnBg }]} onPress={onProceed}>
              <Text style={[styles.secondaryBtnText, { color: theme.secondaryBtnText }]}>OPEN CAREFULLY</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tertiaryBtn} onPress={onClose}>
              <Text style={[styles.tertiaryBtnText, { color: theme.tertiaryText }]}>DISMISS WARNING</Text>
            </TouchableOpacity>
          </>
        )}

        {type === 'danger' && (
          <>
            <TouchableOpacity style={styles.primaryBtn} onPress={onViewDetails}>
              <Text style={styles.primaryBtnText}>FULL REPORT IN CSEC</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tertiaryBtn} onPress={onClose}>
              <Text style={[styles.tertiaryBtnText, { color: theme.tertiaryText }]}>CLOSE</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { borderRadius: 32, padding: 24, alignItems: 'center', width: '90%', maxWidth: 400, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  iconContainer: { marginBottom: 16, marginTop: 10 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  dangerIconWrapper: { position: 'relative' },
  dangerBadgeIndicator: { position: 'absolute', top: -5, right: -5, backgroundColor: '#EF4444', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 16 },
  criticalAlertBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, marginBottom: 16, marginTop: -8 },
  criticalAlertText: { color: '#EF4444', fontSize: 10, fontWeight: 'bold', marginLeft: 4, letterSpacing: 0.5 },
  verdictBox: { borderRadius: 20, padding: 20, width: '100%', marginBottom: 24 },
  verdictHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  verdictLabel: { fontSize: 12, fontWeight: '700', marginLeft: 6, letterSpacing: 0.5, textTransform: 'uppercase' },
  dangerVerdictLabel: { backgroundColor: '#EF4444', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, marginBottom: 4 },
  dangerVerdictLabelText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5, textTransform: 'uppercase' },
  verdictDesc: { fontSize: 14, lineHeight: 22 },
  buttonContainer: { width: '100%', gap: 12 },
  primaryBtn: { backgroundColor: '#2A3B4C', paddingVertical: 16, borderRadius: 24, alignItems: 'center', width: '100%' },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14, letterSpacing: 0.5 },
  secondaryBtn: { paddingVertical: 16, borderRadius: 24, alignItems: 'center', width: '100%' },
  secondaryBtnText: { fontWeight: '700', fontSize: 14, letterSpacing: 0.5 },
  tertiaryBtn: { paddingVertical: 12, alignItems: 'center', width: '100%' },
  tertiaryBtnText: { fontWeight: '700', fontSize: 13, letterSpacing: 0.5 },
  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  footerText: { fontSize: 10, marginLeft: 4 },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  techBox: { padding: 16, borderRadius: 12, borderLeftWidth: 4 },
  techBoxHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  techBoxTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, marginLeft: 6 },
  techBoxText: { fontSize: 14, lineHeight: 22 }
});