import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, useColorScheme } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export type FlagType = 'scanning' | 'safe' | 'warning' | 'danger';

interface FlagProps {
  type: FlagType;
  url: string;
  onProceed: () => void;       // Action to actually open the link
  onClose: () => void;         // Action to close/dismiss the modal
  onViewDetails: () => void;   // Action to route into the C-SEC app details
}

export const FlagContent: React.FC<FlagProps> = ({ type, onProceed, onClose, onViewDetails }) => {
  const isDarkMode = useColorScheme() === 'dark';

  // Dynamic Theme Colors
  const theme = {
    cardBg: isDarkMode ? '#1E293B' : '#FFFFFF',           // Dark slate vs White
    titleText: isDarkMode ? '#F8FAFC' : '#1E293B',        // Off-white vs Dark slate
    descText: isDarkMode ? '#CBD5E1' : '#475569',         // Light grey vs Dark grey
    boxBg: isDarkMode ? '#334155' : '#F8F6F4',            // Slate vs Warm off-white
    secondaryBtnBg: isDarkMode ? '#334155' : '#EAE8E3',   // Slate vs Beige
    secondaryBtnText: isDarkMode ? '#F8FAFC' : '#1E293B', // Off-white vs Dark slate
    tertiaryText: isDarkMode ? '#94A3B8' : '#64748B',     // Medium grey for both
  };

  // Render the "Scanning" state while the model runs
  if (type === 'scanning') {
    return (
      <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
        <ActivityIndicator size="large" color={isDarkMode ? '#38BDF8' : '#2A3B4C'} style={{ marginBottom: 20 }} />
        <Text style={[styles.title, { color: theme.titleText }]}>Analyzing Link...</Text>
        <Text style={[styles.verdictDesc, { color: theme.descText }]}>C-SEC Random Forest model is scanning for threats.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
      
      {/* 1. DYNAMIC HEADER ICON */}
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

      {/* 2. DYNAMIC TITLE & CRITICAL BADGE */}
      <Text style={[styles.title, { color: theme.titleText }]}>
        {type === 'safe' ? 'Safe to Visit' : type === 'warning' ? 'Caution Required' : 'Threat Blocked'}
      </Text>
      
      {type === 'danger' && (
        <View style={styles.criticalAlertBadge}>
          <Ionicons name="shield-half" size={12} color="#EF4444" />
          <Text style={styles.criticalAlertText}>CRITICAL ALERT</Text>
        </View>
      )}

      {/* 3. AI VERDICT BOX */}
      <View style={[styles.verdictBox, { backgroundColor: theme.boxBg }]}>
        <View style={styles.verdictHeader}>
          {type === 'safe' && <Ionicons name="shield-checkmark" size={16} color="#22C55E" />}
          {type === 'warning' && <MaterialCommunityIcons name="robot-outline" size={18} color="#F59E0B" />}
          {type === 'danger' && (
            <View style={styles.dangerVerdictLabel}>
              <Text style={styles.dangerVerdictLabelText}>AI VERDICT</Text>
            </View>
          )}
          {type !== 'danger' && <Text style={[styles.verdictLabel, { color: theme.tertiaryText }]}>AI VERDICT</Text>}
        </View>
        
        <Text style={[styles.verdictDesc, { color: theme.descText }]}>
          {type === 'safe' && 'This link matches known secure patterns.'}
          {type === 'warning' && 'This link shows unusual redirect patterns. It may be attempting to harvest credentials through a mirrored interface.'}
          {type === 'danger' && (
            <Text>
              <Text style={{ fontWeight: 'bold', color: theme.titleText }}>High probability of phishing detected. </Text>
              The URL structure mimics a financial institution but points to an unauthorized server in an untrusted jurisdiction.
            </Text>
          )}
        </Text>
      </View>

      {/* 4. DYNAMIC BUTTONS */}
      <View style={styles.buttonContainer}>
        
        {/* SAFE BUTTONS */}
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

        {/* WARNING BUTTONS */}
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

        {/* DANGER BUTTONS */}
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
  card: {
    borderRadius: 32,
    padding: 24,
    alignItems: 'center',
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    marginBottom: 16,
    marginTop: 10,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dangerIconWrapper: {
    position: 'relative',
  },
  dangerBadgeIndicator: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#EF4444',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 16,
  },
  criticalAlertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 16,
    marginTop: -8,
  },
  criticalAlertText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  verdictBox: {
    borderRadius: 20,
    padding: 20,
    width: '100%',
    marginBottom: 24,
  },
  verdictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  verdictLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  dangerVerdictLabel: {
    backgroundColor: '#EF4444',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 4,
  },
  dangerVerdictLabelText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  verdictDesc: {
    fontSize: 14,
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
    gap: 12, 
  },
  primaryBtn: {
    backgroundColor: '#2A3B4C', 
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    width: '100%',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  secondaryBtn: {
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    width: '100%',
  },
  secondaryBtnText: {
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  tertiaryBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
  },
  tertiaryBtnText: {
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  footerText: {
    fontSize: 10,
    marginLeft: 4,
  }
});