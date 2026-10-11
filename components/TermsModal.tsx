import React, { useState } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface TermsModalProps {
  visible: boolean;
  onClose: () => void;
  onAccept?: () => void;
  defaultToAiTab?: boolean;
}

export default function TermsModal({
  visible,
  onClose,
  onAccept,
  defaultToAiTab = false,
}: TermsModalProps) {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'general' | 'ai'>(defaultToAiTab ? 'ai' : 'general');

  React.useEffect(() => {
    if (visible) {
      setActiveTab(defaultToAiTab ? 'ai' : 'general');
    }
  }, [visible, defaultToAiTab]);

  const modalBg = isDark ? '#16202A' : '#FFFFFF';
  const headerBg = isDark ? '#1E293B' : '#F1F5F9';
  const textColorPrimary = isDark ? '#FFFFFF' : '#0F172A';
  const textColorSecondary = isDark ? '#94A3B8' : '#64748B';
  const activeTabBg = isDark ? '#0284C7' : '#2563EB';
  const inactiveTabBg = isDark ? '#1E293B' : '#E2E8F0';
  const borderColor = isDark ? '#334155' : '#E2E8F0';

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: modalBg, borderColor }]}>
          {/* ── HEADER ────────────────────────────────────── */}
          <View style={[styles.modalHeader, { backgroundColor: headerBg }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons
                name="shield-check-outline"
                size={22}
                color={isDark ? '#38BDF8' : '#2563EB'}
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.modalTitle, { color: textColorPrimary }]}>
                C-SEC Legal & Safety Policies
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={textColorSecondary} />
            </TouchableOpacity>
          </View>

          {/* ── TABS (TERMS VS AI TERMS) ───────────────────── */}
          <View style={[styles.tabBar, { borderBottomColor: borderColor }]}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                { backgroundColor: activeTab === 'general' ? activeTabBg : inactiveTabBg },
              ]}
              onPress={() => setActiveTab('general')}
            >
              <Feather
                name="file-text"
                size={14}
                color={activeTab === 'general' ? '#FFF' : textColorSecondary}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'general' ? '#FFF' : textColorSecondary },
                ]}
              >
                Terms of Service
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                { backgroundColor: activeTab === 'ai' ? activeTabBg : inactiveTabBg },
              ]}
              onPress={() => setActiveTab('ai')}
            >
              <MaterialCommunityIcons
                name="robot-outline"
                size={15}
                color={activeTab === 'ai' ? '#FFF' : textColorSecondary}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'ai' ? '#FFF' : textColorSecondary },
                ]}
              >
                AI & Chatbot Terms
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── CONTENT BODY ──────────────────────────────── */}
          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={{ padding: 18, paddingBottom: 30 }}
            showsVerticalScrollIndicator={true}
          >
            {activeTab === 'general' ? (
              <GeneralTermsContent textColor={textColorPrimary} subColor={textColorSecondary} />
            ) : (
              <AiTermsContent textColor={textColorPrimary} subColor={textColorSecondary} />
            )}
          </ScrollView>

          {/* ── FOOTER ACTIONS ────────────────────────────── */}
          <View style={[styles.modalFooter, { borderTopColor: borderColor, backgroundColor: headerBg }]}>
            {onAccept ? (
              <View style={{ flexDirection: 'row', width: '100%', gap: 10 }}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: isDark ? '#334155' : '#E2E8F0', flex: 1 }]}
                  onPress={onClose}
                >
                  <Text style={[styles.actionBtnText, { color: textColorPrimary }]}>Decline</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#0284C7', flex: 2 }]}
                  onPress={() => {
                    onAccept();
                    onClose();
                  }}
                >
                  <Text style={[styles.actionBtnText, { color: '#FFF', fontWeight: 'bold' }]}>
                    I Accept All Terms
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#0284C7', width: '100%' }]}
                onPress={onClose}
              >
                <Text style={[styles.actionBtnText, { color: '#FFF', fontWeight: 'bold' }]}>Close</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function GeneralTermsContent({ textColor, subColor }: { textColor: string; subColor: string }) {
  return (
    <View>
      <Text style={[styles.effectiveDate, { color: subColor }]}>
        Last Updated: October 2026 • Version 2.4
      </Text>

      <Text style={[styles.sectionHeading, { color: textColor }]}>1. Acceptance of Terms</Text>
      <Text style={[styles.paragraph, { color: subColor }]}>
        By creating an account, downloading, or using the C-SEC Sentinel mobile application and associated services,
        you agree to be legally bound by these Terms and Conditions and our Zero-Trust Privacy Policy. If you do not
        agree with any part of these terms, you are prohibited from utilizing the service.
      </Text>

      <Text style={[styles.sectionHeading, { color: textColor }]}>2. Description of Security Services</Text>
      <Text style={[styles.paragraph, { color: subColor }]}>
        C-SEC Sentinel delivers proactive cyber defense tools, including multi-gate URL scanning, machine learning
        phishing detection, Android link interception, and community threat intelligence. The service analyzes URLs
        and network metadata to identify deceptive, malicious, or spoofed destinations.
      </Text>

      <Text style={[styles.sectionHeading, { color: textColor }]}>3. Zero-Trust Privacy & Data Collection</Text>
      <Text style={[styles.paragraph, { color: subColor }]}>
        • <Text style={{ fontWeight: 'bold' }}>Scanned URLs:</Text> URLs and metadata submitted for analysis are
        processed strictly to determine threat levels and enrich threat feeds. We do NOT sell, lease, or monetize
        your browsing history.{'\n'}
        • <Text style={{ fontWeight: 'bold' }}>Authentication & Profile:</Text> User profiles, email credentials,
        and role designations are securely encrypted using Google Firebase Authentication and Firestore security rules.{'\n'}
        • <Text style={{ fontWeight: 'bold' }}>Account Deletion:</Text> In accordance with privacy regulations,
        you may permanently purge your account, stored history, and reported data via the Security Settings screen at any time.
      </Text>

      <Text style={[styles.sectionHeading, { color: textColor }]}>4. Acceptable Use & Prohibited Conduct</Text>
      <Text style={[styles.paragraph, { color: subColor }]}>
        You agree to use C-SEC Sentinel solely for defensive and authorized verification purposes. You must NOT:{'\n'}
        • Reverse-engineer, decompile, or extract proprietary ML feature extractors.{'\n'}
        • Perform denial-of-service (DoS) or automated stress-testing against backend APIs.{'\n'}
        • Submit fraudulent community reports to maliciously flag legitimate websites.{'\n'}
        • Use our detection telemetry to test evasion methods for malware or phishing campaigns.
      </Text>

      <Text style={[styles.sectionHeading, { color: textColor }]}>5. Limitation of Liability & Warranty Disclaimer</Text>
      <Text style={[styles.paragraph, { color: subColor }]}>
        C-SEC Sentinel is provided on an "AS IS" and "AS AVAILABLE" basis. While our multi-gate engine achieves high
        classification accuracy, no automated tool can guarantee 100% detection of novel, zero-day, or sophisticated
        spear-phishing exploits. C-SEC Sentinel, its contributors, and developers shall not be liable for any direct,
        indirect, or consequential damages resulting from website visits, data breaches, or credential disclosures.
      </Text>

      <Text style={[styles.sectionHeading, { color: textColor }]}>6. Account Termination</Text>
      <Text style={[styles.paragraph, { color: subColor }]}>
        We reserve the right to suspend or permanently ban accounts found in violation of our Acceptable Use policy,
        abusing API rate limits, or engaging in hostile activity.
      </Text>
    </View>
  );
}

function AiTermsContent({ textColor, subColor }: { textColor: string; subColor: string }) {
  return (
    <View>
      <View style={styles.aiNoticeCard}>
        <MaterialCommunityIcons name="information" size={18} color="#0284C7" style={{ marginRight: 6 }} />
        <Text style={styles.aiNoticeText}>
          C-SEC Sentinel incorporates artificial intelligence (Random Forest ML classifiers and Google Gemini AI)
          to assist in threat discovery and cyber defense education.
        </Text>
      </View>

      <Text style={[styles.sectionHeading, { color: textColor }]}>1. Nature of the AI Assistant & Scanner</Text>
      <Text style={[styles.paragraph, { color: subColor }]}>
        The C-SEC Chatbot and Machine Learning URL Classifier are automated algorithmic systems designed to provide
        educational explanations, analyze attack vectors, and detect known phishing patterns. They operate via pattern
        recognition and probabilistic inference.
      </Text>

      <Text style={[styles.sectionHeading, { color: textColor }]}>2. Advisory Status & No Professional Guarantee</Text>
      <Text style={[styles.paragraph, { color: subColor }]}>
        • All AI chatbot responses and automated verdicts are strictly <Text style={{ fontWeight: 'bold' }}>advisory</Text>.{'\n'}
        • AI models may occasionally generate inaccurate, incomplete, or hallucinated information regarding domain
        legitimacy, cyber law, or software vulnerabilities.{'\n'}
        • The chatbot does NOT provide certified legal counsel, digital forensics certification, or guaranteed security warranties.
        Critical security actions should always be verified through authorized system administrators or multi-factor checks.
      </Text>

      <Text style={[styles.sectionHeading, { color: textColor }]}>3. Data Privacy & Confidentiality in AI Prompts</Text>
      <Text style={[styles.paragraph, { color: subColor }]}>
        <Text style={{ fontWeight: 'bold', color: '#EF4444' }}>STRICT WARNING:</Text> Do NOT enter sensitive personal
        information, passwords, private cryptographic keys, credit card numbers, or internal company credentials into
        the Chatbot prompt field. Chat messages are transmitted securely to backend endpoints for AI processing.
      </Text>

      <Text style={[styles.sectionHeading, { color: textColor }]}>4. Prohibited AI Interactions</Text>
      <Text style={[styles.paragraph, { color: subColor }]}>
        You agree never to manipulate, jailbreak, or prompt the AI assistant to:{'\n'}
        • Generate malicious scripts, malware, ransomware, or exploits.{'\n'}
        • Draft deceptive phishing emails, social engineering scripts, or scams.{'\n'}
        • Provide instructions on unauthorized hacking, bypassing firewalls, or breaching third-party systems.{'\n'}
        Our AI backend enforces strict constitutional safety filters. Attempts to generate weaponized material will
        result in account suspension.
      </Text>

      <Text style={[styles.sectionHeading, { color: textColor }]}>5. Limitation of AI Liability</Text>
      <Text style={[styles.paragraph, { color: subColor }]}>
        C-SEC Sentinel is not liable for actions taken, financial losses incurred, or damages sustained as a result
        of recommendations, code snippets, or threat assessments provided by the AI assistant or ML classification gates.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxHeight: '85%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalContent: {
    flexGrow: 1,
  },
  effectiveDate: {
    fontSize: 11,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  paragraph: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 6,
  },
  aiNoticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    borderColor: 'rgba(2, 132, 199, 0.3)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  aiNoticeText: {
    flex: 1,
    fontSize: 11,
    color: '#0284C7',
    lineHeight: 16,
    fontWeight: '600',
  },
  modalFooter: {
    borderTopWidth: 1,
    padding: 12,
  },
  actionBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 13,
  },
});
