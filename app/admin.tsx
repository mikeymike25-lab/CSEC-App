import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Modal, Platform, SafeAreaView, ScrollView, Share, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

// --- FIREBASE IMPORTS ---
import { arrayUnion, collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { 
  forceOverrideLink, 
  removeVerifiedLink, 
  resolveBacklogTicket, 
  exportThreatIntelData,
  updateLinkClassification,
  VerifiedLink,
  TriageTicket 
} from '../services/threatIntelService';

// --- THEME CONTEXT ---
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

interface UserData { uid: string; name: string; email: string; role: string; accountStatus: string; tier: string; }
interface ReportData { id: string; uid: string; accountId: string; email: string; name: string; message: string; createdAt: any; status: string; }

export default function AdminScreen() {
  const router = useRouter();
  const { isDark } = useTheme();

  // --- ADMIN STATE ---
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const adminId = auth.currentUser?.uid ? `CS-${auth.currentUser.uid.substring(0, 4).toUpperCase()}` : 'ADMIN';
  
  // --- GLOBAL CONFIG STATE ---
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [strictScanning, setStrictScanning] = useState(true);
  const [allowNewSignups, setAllowNewSignups] = useState(true);
  const [aiServerUrl, setAiServerUrl] = useState('https://humble-sniffle-7vp6rw45jp67hq9v-5000.app.github.dev');

  // --- NEW FEATURE STATES ---
  const [threatUrl, setThreatUrl] = useState('');
  const [threatCounts, setThreatCounts] = useState({ whitelist: 0, blacklist: 0 });
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [auditLogs, setAuditLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString('en-US', { hour12: false })}] SYSTEM: Secure connection established.`,
    `[${new Date().toLocaleTimeString('en-US', { hour12: false })}] SYSTEM: Awaiting command directives.`
  ]);

  // --- INTELLIGENCE STATS STATE ---
  const [globalStats, setGlobalStats] = useState({ dailyScans: 0, totalWarnings: 0 });

  // --- PERSONNEL MANAGEMENT STATE ---
  const [isDirectoryVisible, setIsDirectoryVisible] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  // --- USER REPORTS STATE ---
  const [isReportsVisible, setIsReportsVisible] = useState(false);
  const [reports, setReports] = useState<ReportData[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);

  // --- 3-DATABASE PIPELINE: RESEARCHER TRIAGE & VERIFIED LINKS STATE ---
  const [isTriageVisible, setIsTriageVisible] = useState(false);
  const [triageTickets, setTriageTickets] = useState<TriageTicket[]>([]);
  const [isVerifiedLinksVisible, setIsVerifiedLinksVisible] = useState(false);
  const [verifiedLinks, setVerifiedLinks] = useState<VerifiedLink[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [verifiedSearch, setVerifiedSearch] = useState('');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // --- TRIAGE FILTER & SEARCH STATE ---
  const [triageSearch, setTriageSearch] = useState('');
  const [triageFilter, setTriageFilter] = useState<'all' | 'pending' | 'high' | 'resolved'>('all');

  // --- LINK CLASSIFICATION EDITOR STATE ---
  const [isClassModalVisible, setIsClassModalVisible] = useState(false);
  const [classTarget, setClassTarget] = useState<{
    id: string;
    url: string;
    domain: string;
    verdict: 'Safe' | 'Phishing';
    category: string;
    notes?: string;
    isFromTriageTicket?: boolean;
  } | null>(null);
  const [editVerdict, setEditVerdict] = useState<'Safe' | 'Phishing'>('Phishing');
  const [editCategory, setEditCategory] = useState('Credential Harvesting');
  const [editCustomCategory, setEditCustomCategory] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSavingClass, setIsSavingClass] = useState(false);

  // --- DYNAMIC COLORS ---
  const bgColor = isDark ? '#121A21' : '#F9F7E8';
  const cardColor = isDark ? '#1A242E' : '#FFFFFF';
  const textColorPrimary = isDark ? '#FFFFFF' : '#1E3246';
  const textColorSecondary = isDark ? '#A9B4C0' : '#8A9AA9';
  const inputBgColor = isDark ? '#233240' : '#F2F0E4';
  const terminalBg = isDark ? '#0D1117' : '#1E3246';
  const terminalText = '#4ADE80'; 
  
  const dangerAccent = '#EF4444';
  const warningAccent = '#F59E0B';
  const successAccent = '#10B981';
  const primaryAccent = isDark ? '#4DA8DA' : '#1E3246';

  useEffect(() => {
    const verifyAdmin = async () => {
      if (!auth.currentUser) return router.replace('/');
      try {
        // Cryptographically verify administrative clearance via Firebase Custom User Claims OR Firestore role
        const tokenResult = await auth.currentUser.getIdTokenResult(true);
        let isAuthorizedAdmin = tokenResult.claims.admin === true;

        if (!isAuthorizedAdmin) {
          try {
            const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
            if (userDoc.exists() && userDoc.data()?.role === 'admin') {
              isAuthorizedAdmin = true;
            }
          } catch (docErr) {
            console.warn("Admin Firestore role fallback check notice:", docErr);
          }
        }

        if (!isAuthorizedAdmin) {
          Alert.alert("Access Denied", "You do not have clearance for this sector.");
          router.replace('/tabs/profile' as any);
          return;
        }
      } catch (err) {
        console.error("Admin verification error:", err);
        Alert.alert("Authentication Error", "Unable to verify security clearance status.");
        router.replace('/tabs/profile' as any);
        return;
      }

      setIsAuthorized(true);
      setIsLoading(false);
      fetchUsers(); 
    };

    verifyAdmin();

    const unsub = onSnapshot(doc(db, 'system', 'config'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMaintenanceMode(data.maintenanceMode ?? false);
        setStrictScanning(data.strictScanning ?? true);
        setAllowNewSignups(data.allowNewSignups ?? true);
        if (data.aiServerUrl) setAiServerUrl(data.aiServerUrl);
      }
    });

    const unsubStats = onSnapshot(doc(db, 'system', 'stats'), (docSnap) => {
        if (docSnap.exists()) {
          setGlobalStats(docSnap.data() as any);
        }
    });

    const unsubThreat = onSnapshot(doc(db, 'system', 'threat_intel'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const wl = Array.isArray(data?.whitelist) ? data.whitelist.length : 0;
        const bl = Array.isArray(data?.blacklist) ? data.blacklist.length : 0;
        setThreatCounts({ whitelist: wl, blacklist: bl });
      }
    });

    // Database 1: Verified Links Listener
    const unsubVerified = onSnapshot(collection(db, 'verified_links'), (snap) => {
      const items: VerifiedLink[] = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() } as VerifiedLink));
      setVerifiedLinks(items);
    });

    // Database 3: Triage Backlog Queue Listener
    const unsubTriage = onSnapshot(collection(db, 'triage_backlog'), (snap) => {
      const tickets: TriageTicket[] = [];
      snap.forEach(d => tickets.push({ id: d.id, ...d.data() } as TriageTicket));
      tickets.sort((a, b) => (b.reportCount || 0) - (a.reportCount || 0));
      setTriageTickets(tickets);
    });

    return () => { 
      unsub(); 
      unsubStats(); 
      unsubThreat(); 
      unsubVerified(); 
      unsubTriage(); 
    };
  }, []);

  const logAction = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    setAuditLogs(prev => [`[${timestamp}] ${adminId}: ${message}`, ...prev].slice(0, 30));
  };

  const updateGlobalConfig = async (key: string, value: any) => {
    try {
      await setDoc(doc(db, 'system', 'config'), { [key]: value }, { merge: true });
      logAction(`Updated system config [${key}]`);
    } catch (error) {
      Alert.alert("Update Failed", "Could not sync configuration.");
    }
  };

  const handleSaveNeuralEngine = () => {
    updateGlobalConfig('aiServerUrl', aiServerUrl);
    Alert.alert("Neural Engine Rerouted", "All agents will now route scans to the new server.");
    logAction(`Rerouted AI Engine to ${aiServerUrl}`);
  };

  // UPDATED: Now saves both the broadcast message and the current timestamp
  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim()) return;
    try {
      await setDoc(doc(db, 'system', 'config'), {
        activeBroadcast: broadcastMessage,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      Alert.alert("Broadcast Transmitted", "Message sent to all active agents.");
      logAction(`Sent Global Broadcast: "${broadcastMessage}"`);
      setBroadcastMessage('');
    } catch (error) {
      Alert.alert("Transmission Failed", "Could not sync broadcast configuration.");
    }
  };

  const handleThreatIntel = async (type: 'whitelist' | 'blacklist') => {
    const cleanTarget = threatUrl.trim().toLowerCase();
    if (!cleanTarget) {
      Alert.alert("Input Required", "Please enter a valid domain or URL to override.");
      return;
    }

    try {
      const verdict = type === 'whitelist' ? 'Safe' : 'Phishing';
      const res = await forceOverrideLink(cleanTarget, verdict, 'Admin Direct Override');

      Alert.alert(
        "Matrix Enforced 🛡️",
        `Target "${res.domain}" is now permanently enforced as ${verdict.toUpperCase()}.\n\n✓ Written to Database 1 (Verified Truth)\n✓ Cleared from opposing blacklist/whitelist\n✓ All mobile scanners will apply this immediately.`
      );
      logAction(`Enforced ${res.domain} as ${verdict.toUpperCase()} in DB 1 Matrix`);
      setThreatUrl('');
    } catch (error: any) {
      console.error("Threat Intel Update Failed:", error);
      Alert.alert("Update Failed", "Could not persist threat override: " + error.message);
    }
  };

  const handleCopyLink = async (targetUrl: string) => {
    if (!targetUrl) return;
    try {
      await Clipboard.setStringAsync(targetUrl);
      setCopiedUrl(targetUrl);
      setTimeout(() => {
        setCopiedUrl(null);
      }, 2500);
    } catch (e) {
      console.error("Clipboard copy error:", e);
    }
  };

  const handleResolveTriage = async (ticket: TriageTicket, verdict: 'Safe' | 'Phishing') => {
    try {
      await resolveBacklogTicket(ticket.id, ticket.url, verdict);
      setActionFeedback(`Verified "${ticket.domain}" as ${verdict.toUpperCase()} (Promoted to Database 1)`);
      setTimeout(() => setActionFeedback(null), 4000);
      logAction(`Resolved Triage Ticket for ${ticket.domain} -> ${verdict}`);
    } catch (err: any) {
      Alert.alert("Triage Error", err.message || "Failed to resolve ticket.");
    }
  };

  const handleOpenClassEditorForVerified = (link: VerifiedLink) => {
    setClassTarget({
      id: link.id,
      url: link.url,
      domain: link.domain,
      verdict: link.verdict,
      category: link.category || 'General',
      notes: link.notes || '',
      isFromTriageTicket: false
    });
    setEditVerdict(link.verdict);
    const standardCategories = [
      'Credential Harvesting', 'Financial / Bank Spoof', 'Malware Distribution',
      'Brand Impersonation', 'Account Takeover', 'Academic Portal',
      'Government / Utility', 'Legitimate Corporate', 'General Safe Domain'
    ];
    if (standardCategories.includes(link.category || '')) {
      setEditCategory(link.category || 'Credential Harvesting');
      setEditCustomCategory('');
    } else if (link.category) {
      setEditCategory('Custom');
      setEditCustomCategory(link.category);
    } else {
      setEditCategory(link.verdict === 'Safe' ? 'Legitimate Corporate' : 'Credential Harvesting');
      setEditCustomCategory('');
    }
    setEditNotes(link.notes || '');
    setIsClassModalVisible(true);
  };

  const handleOpenClassEditorForTriage = (ticket: TriageTicket) => {
    setClassTarget({
      id: ticket.id,
      url: ticket.url,
      domain: ticket.domain,
      verdict: 'Phishing',
      category: 'Credential Harvesting',
      notes: ticket.notes || '',
      isFromTriageTicket: true
    });
    setEditVerdict('Phishing');
    setEditCategory('Credential Harvesting');
    setEditCustomCategory('');
    setEditNotes(ticket.notes || '');
    setIsClassModalVisible(true);
  };

  const handleSaveClassification = async () => {
    if (!classTarget) return;
    setIsSavingClass(true);
    try {
      const finalCategory = editCategory === 'Custom'
        ? (editCustomCategory.trim() || 'Custom Security Classification')
        : editCategory;

      if (classTarget.isFromTriageTicket) {
        await resolveBacklogTicket(classTarget.id, classTarget.url, editVerdict, finalCategory, editNotes);
        setActionFeedback(`Classified & Promoted "${classTarget.domain}" as ${editVerdict.toUpperCase()} [${finalCategory}]`);
      } else {
        await updateLinkClassification(classTarget.url, editVerdict, finalCategory, editNotes);
        setActionFeedback(`Updated classification for "${classTarget.domain}" to ${editVerdict.toUpperCase()} [${finalCategory}]`);
      }
      setTimeout(() => setActionFeedback(null), 4000);
      logAction(`Classified ${classTarget.domain} -> ${editVerdict} (${finalCategory})`);
      setIsClassModalVisible(false);
      setClassTarget(null);
    } catch (err: any) {
      Alert.alert("Classification Error", err.message || "Failed to update link classification.");
    } finally {
      setIsSavingClass(false);
    }
  };

  const handleRemoveVerified = (link: VerifiedLink) => {
    Alert.alert(
      "Remove Override",
      `Are you sure you want to remove "${link.domain}" from the ${link.verdict} matrix? Scanners will revert to standard AI heuristics.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive",
          onPress: async () => {
            try {
              await removeVerifiedLink(link.id, link.domain, link.verdict);
              logAction(`Removed ${link.domain} from Verified ${link.verdict} matrix`);
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to remove verified link.");
            }
          }
        }
      ]
    );
  };

  const handleExportData = async (format: 'csv' | 'json') => {
    setIsExporting(true);
    try {
      const { dataString, filename, count } = await exportThreatIntelData(format);
      if (count === 0) {
        Alert.alert("No Records", "There are currently no verified links to export.");
        return;
      }

      if (Platform.OS === 'web') {
        const mimeType = format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/json;charset=utf-8;';
        const blob = new Blob([dataString], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        Alert.alert("Export Downloaded", `Saved ${count} verified threat intelligence records to ${filename}`);
      } else {
        await Share.share({
          title: `C-SEC Threat Intelligence Export (${format.toUpperCase()})`,
          message: dataString
        });
      }
      logAction(`Exported ${count} Threat Intel Records (${format.toUpperCase()})`);
    } catch (err: any) {
      Alert.alert("Export Error", err.message || "Failed to export data.");
    } finally {
      setIsExporting(false);
    }
  };

  // --- FETCH USERS ---
  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersList: UserData[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        usersList.push({
          uid: data.uid || doc.id, 
          name: data.name || 'Unknown Agent', 
          email: data.email || 'No Email Found',
          role: data.role || 'user', 
          accountStatus: data.accountStatus || 'active', 
          tier: data.tier || 'Tier 1'
        });
      });
      setUsers(usersList);
    } catch (error) {
      Alert.alert("Error", "Could not fetch personnel data.");
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const changeUserStatus = async (uid: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), { accountStatus: newStatus });
      setUsers(users.map(u => u.uid === uid ? { ...u, accountStatus: newStatus } : u));
      setSelectedUser(null);
      logAction(`Changed user protocol ${uid.substring(0,4)} to ${newStatus.toUpperCase()}`);
    } catch (error) {
      Alert.alert("Error", "Failed to update agent status.");
    }
  };

  // --- NEW: FETCH & MANAGE REPORTS ---
  const fetchReports = async () => {
    setIsLoadingReports(true);
    try {
      // Order reports by newest first
      const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const reportsList: ReportData[] = [];
      
      querySnapshot.forEach((doc) => {
        reportsList.push({ id: doc.id, ...doc.data() } as ReportData);
      });
      
      setReports(reportsList);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not fetch reports from the database.");
    } finally {
      setIsLoadingReports(false);
    }
  };

  const markReportRead = async (reportId: string) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), { status: 'read' });
      setReports(reports.map(r => r.id === reportId ? { ...r, status: 'read' } : r));
      logAction(`Marked report ID ${reportId.substring(0,4)} as read`);
    } catch (error) {
      Alert.alert("Error", "Failed to update report status.");
    }
  };

  const filteredUsers = users.filter(u => 
    (u.name || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
    (u.email || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTriageTickets = triageTickets.filter((ticket) => {
    const term = triageSearch.trim().toLowerCase();
    const matchesSearch = !term ||
      (ticket.domain || '').toLowerCase().includes(term) ||
      (ticket.url || '').toLowerCase().includes(term) ||
      (ticket.reasons || []).some(r => r.toLowerCase().includes(term)) ||
      (ticket.initialVerdict || '').toLowerCase().includes(term) ||
      (ticket.resolution || '').toLowerCase().includes(term);
    
    if (!matchesSearch) return false;

    if (triageFilter === 'pending') return ticket.status === 'pending';
    if (triageFilter === 'high') return ticket.priority === 'HIGH' && ticket.status === 'pending';
    if (triageFilter === 'resolved') return ticket.status === 'resolved';
    return true;
  });

  const getStatusColor = (status: string) => { 
    if (status === 'suspended') return warningAccent; 
    if (status === 'banned') return dangerAccent; 
    return successAccent; 
  };

  // Reconciled counts connecting Threat Intelligence Matrix & Researcher Triage Pipeline
  const verifiedSafeCount = verifiedLinks.filter(l => l.verdict === 'Safe').length;
  const verifiedPhishingCount = verifiedLinks.filter(l => l.verdict === 'Phishing').length;
  const displayWhitelistCount = Math.max(threatCounts.whitelist, verifiedSafeCount);
  const displayBlacklistCount = Math.max(threatCounts.blacklist, verifiedPhishingCount);
  const displayTotalOverrides = Math.max(verifiedLinks.length, displayWhitelistCount + displayBlacklistCount);

  const pendingTriageCount = triageTickets.filter(t => t.status === 'pending').length;
  const resolvedTriageCount = triageTickets.filter(t => t.status === 'resolved').length;

  if (isLoading || !isAuthorized) {
    return <View style={[styles.safeArea, { backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color="#4DA8DA" /></View>;
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bgColor }]}>
      <View style={styles.container}>
        
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: cardColor }]} 
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={24} color={textColorPrimary} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: textColorPrimary }]}>Command Center</Text>
            <Text style={[styles.headerSubtitle, { color: textColorSecondary }]}>ID: {adminId}</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* 1. SYSTEM AUDIT LOG */}
          <View style={[styles.terminalCard, { backgroundColor: terminalBg }]}>
            <View style={styles.terminalHeader}>
              <MaterialCommunityIcons name="console-network" size={16} color={terminalText} />
              <Text style={[styles.terminalTitle, { color: terminalText }]}>LIVE AUDIT LOG</Text>
            </View>
            <ScrollView style={styles.terminalBody} nestedScrollEnabled={true}>
              {auditLogs.map((log, index) => (
                <Text key={index} style={[styles.terminalLine, { color: terminalText, opacity: index === 0 ? 1 : 0.7 }]}>{log}</Text>
              ))}
            </ScrollView>
          </View>

          {/* 2. THREAT INTELLIGENCE MATRIX */}
          <View style={[styles.card, { backgroundColor: cardColor }]}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="shield-half-full" size={20} color={primaryAccent} />
              <Text style={[styles.cardTitle, { color: textColorPrimary }]}>Threat Intelligence Matrix</Text>
            </View>
            <Text style={[styles.toggleSubtitle, { color: textColorSecondary, marginBottom: 8 }]}>
              Manually override AI classification for specific domains.
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
              <Feather name="link-2" size={12} color={isDark ? '#4DA8DA' : '#0284C7'} style={{ marginRight: 5 }} />
              <Text style={{ color: isDark ? '#4DA8DA' : '#0284C7', fontSize: 11, fontWeight: '700' }}>
                Synced with Database 1 (Truth Matrix) & Triage Sandbox
              </Text>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: successAccent + '40' }}>
                <Feather name="shield" size={12} color={successAccent} style={{ marginRight: 5 }} />
                <Text style={{ color: successAccent, fontSize: 11, fontWeight: '700' }}>
                  {displayWhitelistCount} Whitelisted
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: dangerAccent + '40' }}>
                <Feather name="alert-triangle" size={12} color={dangerAccent} style={{ marginRight: 5 }} />
                <Text style={{ color: dangerAccent, fontSize: 11, fontWeight: '700' }}>
                  {displayBlacklistCount} Blacklisted
                </Text>
              </View>
            </View>
            
            <TextInput 
              style={[styles.inputBox, { backgroundColor: inputBgColor, color: textColorPrimary }]} 
              placeholder="e.g., safe-site.com or malicious.net" 
              placeholderTextColor={textColorSecondary}
              value={threatUrl}
              onChangeText={setThreatUrl}
              autoCapitalize="none"
            />
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.halfButton, { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: successAccent }]} onPress={() => handleThreatIntel('whitelist')}>
                <Feather name="check-circle" size={16} color={successAccent} />
                <Text style={[styles.halfButtonText, { color: successAccent }]}>Force Whitelist</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.halfButton, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: dangerAccent }]} onPress={() => handleThreatIntel('blacklist')}>
                <Feather name="x-octagon" size={16} color={dangerAccent} />
                <Text style={[styles.halfButtonText, { color: dangerAccent }]}>Force Blacklist</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.divider, { backgroundColor: isDark ? '#2D4356' : '#F2F0E4', marginVertical: 14 }]} />

            {/* Quick Actions: Manage Matrix & Export Intel Data */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity 
                style={[styles.halfButton, { backgroundColor: isDark ? '#233240' : '#F2F0E4', borderColor: isDark ? '#4DA8DA' : '#2D4356' }]} 
                onPress={() => setIsVerifiedLinksVisible(true)}
              >
                <Feather name="list" size={15} color={textColorPrimary} />
                <Text style={[styles.halfButtonText, { color: textColorPrimary }]}>Manage ({displayTotalOverrides})</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.halfButton, { backgroundColor: isDark ? '#233240' : '#F2F0E4', borderColor: isDark ? '#4DA8DA' : '#2D4356' }]} 
                onPress={() => handleExportData('csv')}
                disabled={isExporting}
              >
                <Feather name="download" size={15} color={isDark ? '#4DA8DA' : '#1E3246'} />
                <Text style={[styles.halfButtonText, { color: isDark ? '#4DA8DA' : '#1E3246' }]}>
                  {isExporting ? 'Exporting...' : 'Export CSV'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 2.5 RESEARCHER TRIAGE & BACKLOG (DATABASE 3) */}
          <View style={[styles.card, { backgroundColor: cardColor, borderColor: isDark ? '#38BDF8' : '#0284C7', borderWidth: 1 }]}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="clipboard-clock-outline" size={20} color={isDark ? '#38BDF8' : '#0284C7'} />
              <Text style={[styles.cardTitle, { color: textColorPrimary }]}>Researcher Triage Sandbox</Text>
            </View>
            <Text style={[styles.toggleSubtitle, { color: textColorSecondary, marginBottom: 12 }]}>
              Database 3 Backlog: Validate user-submitted & AI greylist links before promoting to Database 1.
            </Text>

            <View style={styles.statsGrid}>
              <View style={[styles.statBox, { backgroundColor: inputBgColor }]}>
                <Text style={[styles.statLabel, { color: warningAccent }]}>ACTIVE BACKLOG</Text>
                <Text style={[styles.statValue, { color: warningAccent }]}>
                  {triageTickets.filter(t => t.status === 'pending').length}
                </Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: inputBgColor }]}>
                <Text style={[styles.statLabel, { color: successAccent }]}>VERIFIED & PROMOTED</Text>
                <Text style={[styles.statValue, { color: successAccent }]}>
                  {triageTickets.filter(t => t.status === 'resolved').length}
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.primaryButton, { backgroundColor: isDark ? '#0284C7' : '#0369A1', marginTop: 12 }]} 
              onPress={() => setIsTriageVisible(true)}
            >
              <Feather name="inbox" size={18} color="#FFF" />
              <Text style={styles.primaryButtonText}>
                Open Triage Queue ({triageTickets.filter(t => t.status === 'pending').length} Pending)
              </Text>
            </TouchableOpacity>
          </View>

          {/* 3. NEURAL ENGINE ROUTING */}
          <View style={[styles.card, { backgroundColor: cardColor }]}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="brain" size={20} color={primaryAccent} />
              <Text style={[styles.cardTitle, { color: textColorPrimary }]}>Neural Engine Routing</Text>
            </View>
            <Text style={[styles.toggleSubtitle, { color: textColorSecondary, marginBottom: 15 }]}>Update the target API URL for the Deep AI Python server.</Text>
            
            <TextInput 
              style={[styles.inputBox, { backgroundColor: inputBgColor, color: textColorPrimary }]} 
              value={aiServerUrl}
              onChangeText={setAiServerUrl}
              autoCapitalize="none"
            />
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: primaryAccent, marginTop: 10 }]} onPress={handleSaveNeuralEngine}>
              <MaterialCommunityIcons name="satellite-uplink" size={20} color="#FFF" />
              <Text style={styles.primaryButtonText}>Reroute Scanners</Text>
            </TouchableOpacity>
          </View>

          {/* 4. GLOBAL BROADCAST */}
          <View style={[styles.card, { backgroundColor: cardColor }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="megaphone" size={20} color={warningAccent} />
              <Text style={[styles.cardTitle, { color: textColorPrimary }]}>Global Broadcast</Text>
            </View>
            <TextInput 
              style={[styles.inputBox, { backgroundColor: inputBgColor, color: textColorPrimary, minHeight: 80, paddingTop: 15 }]} 
              placeholder="Enter emergency broadcast message..." 
              placeholderTextColor={textColorSecondary}
              value={broadcastMessage}
              onChangeText={setBroadcastMessage}
              multiline
            />
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: warningAccent, marginTop: 10 }]} onPress={handleSendBroadcast}>
              <Feather name="send" size={20} color="#FFF" />
              <Text style={styles.primaryButtonText}>Transmit to All Agents</Text>
            </TouchableOpacity>
          </View>

          {/* 5. PERSONNEL MANAGEMENT */}
          <View style={[styles.card, { backgroundColor: cardColor }]}>
            <View style={styles.cardHeader}>
              <Feather name="users" size={20} color={primaryAccent} />
              <Text style={[styles.cardTitle, { color: textColorPrimary }]}>Personnel Management</Text>
            </View>
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: primaryAccent }]} onPress={() => { fetchUsers(); setIsDirectoryVisible(true); }}>
              <MaterialCommunityIcons name="folder-account-outline" size={20} color="#FFF" />
              <Text style={styles.primaryButtonText}>Access Agent Directory</Text>
            </TouchableOpacity>
          </View>

          {/* --- 6. USER REPORTS INBOX --- */}
          <View style={[styles.card, { backgroundColor: cardColor }]}>
            <View style={styles.cardHeader}>
              <Feather name="inbox" size={20} color={dangerAccent} />
              <Text style={[styles.cardTitle, { color: textColorPrimary }]}>User Feedback & Reports</Text>
            </View>
            <Text style={[styles.toggleSubtitle, { color: textColorSecondary, marginBottom: 15 }]}>Review bugs and feedback submitted by active agents.</Text>
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: dangerAccent }]} onPress={() => { fetchReports(); setIsReportsVisible(true); }}>
              <Feather name="message-square" size={20} color="#FFF" />
              <Text style={styles.primaryButtonText}>View Report Inbox</Text>
            </TouchableOpacity>
          </View>

          {/* 7. GLOBAL DIRECTIVES */}
          <View style={[styles.card, { backgroundColor: cardColor }]}>
            <View style={styles.cardHeader}>
              <Feather name="sliders" size={20} color={primaryAccent} />
              <Text style={[styles.cardTitle, { color: textColorPrimary }]}>Global Directives</Text>
            </View>
            <View style={styles.toggleRow}>
              <View style={styles.toggleTextContainer}><Text style={[styles.toggleTitle, { color: dangerAccent }]}>System Maintenance Mode</Text><Text style={[styles.toggleSubtitle, { color: textColorSecondary }]}>Locks all non-admin users out.</Text></View>
              <Switch trackColor={{ false: isDark ? "#2D4356" : "#D1D5DB", true: dangerAccent }} thumbColor={"#FFFFFF"} value={maintenanceMode} onValueChange={(val) => updateGlobalConfig('maintenanceMode', val)} />
            </View>
            <View style={[styles.divider, { backgroundColor: isDark ? '#2D4356' : '#F2F0E4' }]} />
            <View style={styles.toggleRow}>
              <View style={styles.toggleTextContainer}><Text style={[styles.toggleTitle, { color: textColorPrimary }]}>Open Registration</Text><Text style={[styles.toggleSubtitle, { color: textColorSecondary }]}>Allow new users to join.</Text></View>
              <Switch trackColor={{ false: isDark ? "#2D4356" : "#D1D5DB", true: "#4DA8DA" }} thumbColor={"#FFFFFF"} value={allowNewSignups} onValueChange={(val) => updateGlobalConfig('allowNewSignups', val)} />
            </View>
          </View>

          {/* 8. INTELLIGENCE OVERVIEW */}
          <View style={[styles.card, { backgroundColor: cardColor }]}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="chart-box-outline" size={20} color={primaryAccent} />
              <Text style={[styles.cardTitle, { color: textColorPrimary }]}>Intelligence Overview</Text>
            </View>
            
            <View style={styles.statsGrid}>
              <View style={[styles.statBox, { backgroundColor: inputBgColor }]}>
                <Text style={[styles.statLabel, { color: textColorSecondary }]}>TOTAL ACCOUNTS</Text>
                <Text style={[styles.statValue, { color: textColorPrimary }]}>{users.length}</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: inputBgColor }]}>
                <Text style={[styles.statLabel, { color: textColorSecondary }]}>ACTIVE AGENTS</Text>
                <Text style={[styles.statValue, { color: successAccent }]}>{users.filter(u => u.role === 'admin' || u.role === 'agent').length}</Text>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <View style={[styles.statBox, { backgroundColor: inputBgColor }]}>
                <Text style={[styles.statLabel, { color: textColorSecondary }]}>DAILY USE</Text>
                <Text style={[styles.statValue, { color: textColorPrimary }]}>{globalStats.dailyScans || 0}</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: inputBgColor }]}>
                <Text style={[styles.statLabel, { color: textColorSecondary }]}>WARNINGS</Text>
                <Text style={[styles.statValue, { color: dangerAccent }]}>{globalStats.totalWarnings || 0}</Text>
              </View>
            </View>
          </View>

        </ScrollView>

        {/* --- USER REPORTS MODAL --- */}
        <Modal visible={isReportsVisible} animationType="slide" presentationStyle="pageSheet">
          <View style={[styles.modalContainer, { backgroundColor: bgColor }]}>
            <View style={[styles.modalHeader, { backgroundColor: cardColor }]}>
              <View>
                <Text style={[styles.modalTitle, { color: textColorPrimary }]}>Report Inbox</Text>
                <Text style={[styles.headerSubtitle, { color: textColorSecondary, marginTop: 2 }]}>
                  {reports.filter(r => r.status === 'unread').length} Unread Reports
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsReportsVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close-circle" size={30} color={textColorSecondary} />
              </TouchableOpacity>
            </View>

            {isLoadingReports ? (
              <ActivityIndicator size="large" color={dangerAccent} style={{ marginTop: 50 }} />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
                {reports.length === 0 ? (
                  <Text style={{ color: textColorSecondary, textAlign: 'center', marginTop: 40, fontSize: 16 }}>No reports found.</Text>
                ) : (
                  reports.map((report) => (
                    <View 
                      key={report.id} 
                      style={[
                        styles.userCard, 
                        { 
                          backgroundColor: cardColor, 
                          borderLeftWidth: 4, 
                          borderLeftColor: report.status === 'unread' ? warningAccent : isDark ? '#2D4356' : '#EAE8D9' 
                        }
                      ]}
                    >
                      <View style={styles.userInfoRow}>
                        <View style={styles.userDetails}>
                          <Text style={[styles.userName, { color: textColorPrimary }]}>{report.name}</Text>
                          <Text style={[styles.userEmail, { color: textColorSecondary }]}>{report.email} • ID: {report.accountId}</Text>
                        </View>
                        {report.status === 'unread' && (
                          <View style={{ backgroundColor: warningAccent, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 }}>
                            <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>NEW</Text>
                          </View>
                        )}
                      </View>
                      
                      <View style={[styles.divider, { backgroundColor: isDark ? '#2D4356' : '#F2F0E4', marginVertical: 12 }]} />
                      
                      <Text style={{ color: textColorPrimary, fontSize: 14, lineHeight: 22, marginBottom: 15 }}>
                        "{report.message}"
                      </Text>
                      
                      {report.status === 'unread' ? (
                        <TouchableOpacity 
                          style={[styles.editBtn, { backgroundColor: isDark ? '#2D4356' : '#F2F0E4', alignSelf: 'flex-start' }]} 
                          onPress={() => markReportRead(report.id)}
                        >
                          <Feather name="check" size={14} color={successAccent} />
                          <Text style={[styles.editBtnText, { color: successAccent }]}>Mark as Read</Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={{ color: textColorSecondary, fontSize: 12, fontWeight: 'bold', fontStyle: 'italic' }}>
                          <Feather name="check-circle" size={12} /> Reviewed
                        </Text>
                      )}
                    </View>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </Modal>

        {/* --- AGENT DIRECTORY MODAL --- */}
        <Modal visible={isDirectoryVisible} animationType="slide" presentationStyle="pageSheet">
          <View style={[styles.modalContainer, { backgroundColor: bgColor }]}>
            <View style={[styles.modalHeader, { backgroundColor: cardColor }]}>
              <View>
                <Text style={[styles.modalTitle, { color: textColorPrimary }]}>Agent Roster</Text>
                <Text style={[styles.headerSubtitle, { color: textColorSecondary, marginTop: 2 }]}>{users.length} Total Accounts</Text>
              </View>
              <TouchableOpacity onPress={() => setIsDirectoryVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close-circle" size={30} color={textColorSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <View style={[styles.searchBox, { backgroundColor: inputBgColor }]}>
                <Feather name="search" size={20} color={textColorSecondary} style={{ marginRight: 10 }} />
                <TextInput style={[styles.searchInput, { color: textColorPrimary }]} placeholder="Search by name or email..." placeholderTextColor={textColorSecondary} value={searchQuery} onChangeText={setSearchQuery} />
              </View>
            </View>

            {isLoadingUsers ? (
              <ActivityIndicator size="large" color={primaryAccent} style={{ marginTop: 50 }} />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
                {filteredUsers.map((user) => (
                  <View key={user.uid} style={[styles.userCard, { backgroundColor: cardColor }]}>
                    <View style={styles.userInfoRow}>
                      <View style={[styles.userAvatar, { backgroundColor: isDark ? '#2D4356' : '#EAE8D9' }]}>
                        <Text style={[styles.userAvatarText, { color: textColorPrimary }]}>{(user.name?.charAt(0) || "?").toUpperCase()}</Text>
                      </View>
                      <View style={styles.userDetails}>
                        <Text style={[styles.userName, { color: textColorPrimary }]}>{user.name || "Unknown Agent"}</Text>
                        <Text style={[styles.userEmail, { color: textColorSecondary }]}>{user.email || "No Email Found"}</Text>
                        
                        <Text style={[styles.userRole, { color: textColorSecondary }]}>
                          ID: CS-{(user.uid?.substring(0, 4) || "####").toUpperCase()} • {(user.role || "USER").toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.divider, { backgroundColor: isDark ? '#2D4356' : '#F2F0E4', marginVertical: 15 }]} />
                    <View style={styles.actionRow}>
                      <View style={[styles.statusPill, { backgroundColor: getStatusColor(user.accountStatus) + '20' }]}>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(user.accountStatus) }]} />
                        <Text style={[styles.statusText, { color: getStatusColor(user.accountStatus) }]}>{(user.accountStatus || "ACTIVE").toUpperCase()}</Text>
                      </View>
                      <TouchableOpacity style={[styles.editBtn, { backgroundColor: isDark ? '#2D4356' : '#F2F0E4' }]} onPress={() => setSelectedUser(selectedUser?.uid === user.uid ? null : user)}>
                        <Feather name="edit-2" size={14} color={textColorPrimary} />
                        <Text style={[styles.editBtnText, { color: textColorPrimary }]}>Modify</Text>
                      </TouchableOpacity>
                    </View>
                    {selectedUser?.uid === user.uid && (
                      <View style={[styles.expandedActions, { backgroundColor: isDark ? '#121A21' : '#F9F7E8' }]}>
                        <Text style={[styles.actionLabel, { color: textColorSecondary }]}>CHANGE STATUS PROTOCOL:</Text>
                        <View style={styles.actionGrid}>
                          <TouchableOpacity style={[styles.actionBtn, { borderColor: successAccent }]} onPress={() => changeUserStatus(user.uid, 'active')}><Text style={[styles.actionBtnText, { color: successAccent }]}>Active</Text></TouchableOpacity>
                          <TouchableOpacity style={[styles.actionBtn, { borderColor: warningAccent }]} onPress={() => changeUserStatus(user.uid, 'suspended')}><Text style={[styles.actionBtnText, { color: warningAccent }]}>Suspend</Text></TouchableOpacity>
                          <TouchableOpacity style={[styles.actionBtn, { borderColor: dangerAccent }]} onPress={() => changeUserStatus(user.uid, 'banned')}><Text style={[styles.actionBtnText, { color: dangerAccent }]}>Ban</Text></TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </Modal>

        {/* --- DATABASE 1: VERIFIED LINKS & EXPORT MODAL --- */}
        <Modal visible={isVerifiedLinksVisible} animationType="slide" presentationStyle="pageSheet">
          <View style={[styles.modalContainer, { backgroundColor: bgColor }]}>
            <View style={[styles.modalHeader, { backgroundColor: cardColor }]}>
              <View>
                <Text style={[styles.modalTitle, { color: textColorPrimary }]}>Verified Threat Matrix</Text>
                <Text style={[styles.headerSubtitle, { color: textColorSecondary, marginTop: 2 }]}>
                  Database 1: {verifiedLinks.length} Authoritative Ground Truth Links
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsVerifiedLinksVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close-circle" size={30} color={textColorSecondary} />
              </TouchableOpacity>
            </View>

            {/* Search Filter */}
            <View style={styles.searchContainer}>
              <View style={[styles.searchBox, { backgroundColor: inputBgColor }]}>
                <Feather name="search" size={20} color={textColorSecondary} style={{ marginRight: 10 }} />
                <TextInput 
                  style={[styles.searchInput, { color: textColorPrimary }]} 
                  placeholder="Filter verified domains..." 
                  placeholderTextColor={textColorSecondary} 
                  value={verifiedSearch} 
                  onChangeText={setVerifiedSearch} 
                />
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
              {verifiedLinks.filter(l => (l.domain || '').toLowerCase().includes(verifiedSearch.toLowerCase()) || (l.url || '').toLowerCase().includes(verifiedSearch.toLowerCase())).length === 0 ? (
                <Text style={{ color: textColorSecondary, textAlign: 'center', marginTop: 40, fontSize: 16 }}>
                  No verified links found in Database 1.
                </Text>
              ) : (
                verifiedLinks
                  .filter(l => (l.domain || '').toLowerCase().includes(verifiedSearch.toLowerCase()) || (l.url || '').toLowerCase().includes(verifiedSearch.toLowerCase()))
                  .map((link) => (
                    <View 
                      key={link.id} 
                      style={[
                        styles.userCard, 
                        { 
                          backgroundColor: cardColor, 
                          borderLeftWidth: 4, 
                          borderLeftColor: link.verdict === 'Safe' ? successAccent : dangerAccent 
                        }
                      ]}
                    >
                      <View style={styles.userInfoRow}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                          <Text style={[styles.userName, { color: textColorPrimary }]} numberOfLines={1}>
                            {link.domain}
                          </Text>
                          <Text style={[styles.userEmail, { color: textColorSecondary }]} numberOfLines={1}>
                            {link.url}
                          </Text>
                          <TouchableOpacity 
                            style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, alignSelf: 'flex-start' }}
                            onPress={() => handleCopyLink(link.url)}
                            activeOpacity={0.7}
                          >
                            <Feather 
                              name={copiedUrl === link.url ? "check" : "copy"} 
                              size={12} 
                              color={copiedUrl === link.url ? successAccent : (isDark ? '#4DA8DA' : '#0284C7')} 
                              style={{ marginRight: 4 }}
                            />
                            <Text style={{ fontSize: 11, fontWeight: '600', color: copiedUrl === link.url ? successAccent : (isDark ? '#4DA8DA' : '#0284C7') }}>
                              {copiedUrl === link.url ? "Copied!" : "Copy Link"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={{ backgroundColor: link.verdict === 'Safe' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                            <Text style={{ color: link.verdict === 'Safe' ? successAccent : dangerAccent, fontSize: 11, fontWeight: 'bold' }}>
                              {link.verdict.toUpperCase()}
                            </Text>
                          </View>
                          <TouchableOpacity 
                            onPress={() => handleOpenClassEditorForVerified(link)}
                            style={{ paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, backgroundColor: isDark ? '#233240' : '#F1F5F9', flexDirection: 'row', alignItems: 'center', gap: 4 }}
                          >
                            <Feather name="edit-3" size={13} color={isDark ? '#4DA8DA' : '#0284C7'} />
                            <Text style={{ fontSize: 11, fontWeight: '600', color: isDark ? '#4DA8DA' : '#0284C7' }}>Classify</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            onPress={() => handleRemoveVerified(link)}
                            style={{ padding: 6, borderRadius: 8, backgroundColor: isDark ? '#233240' : '#F1F5F9' }}
                          >
                            <Feather name="trash-2" size={14} color={dangerAccent} />
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={[styles.divider, { backgroundColor: isDark ? '#2D4356' : '#F2F0E4', marginVertical: 10 }]} />

                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                        <Text style={{ color: textColorSecondary, fontSize: 11 }}>
                          Verified by: <Text style={{ color: textColorPrimary, fontWeight: '600' }}>{link.verifiedBy || 'Admin'}</Text>
                        </Text>
                        <View style={{ backgroundColor: isDark ? '#233240' : '#E2E8F0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: isDark ? '#38BDF8' : '#0369A1' }}>
                            🏷️ {link.category || 'General'}
                          </Text>
                        </View>
                      </View>
                      {link.notes ? (
                        <Text style={{ color: textColorSecondary, fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>
                          Note: "{link.notes}"
                        </Text>
                      ) : null}
                    </View>
                  ))
              )}
            </ScrollView>

            {/* Bottom Export Bar */}
            <View style={{ padding: 20, backgroundColor: cardColor, borderTopWidth: 1, borderTopColor: isDark ? '#2D4356' : '#E2E8F0', flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity 
                style={[styles.primaryButton, { flex: 1, backgroundColor: successAccent, paddingVertical: 14 }]}
                onPress={() => handleExportData('csv')}
                disabled={isExporting}
              >
                <Feather name="download" size={16} color="#FFF" />
                <Text style={[styles.primaryButtonText, { fontSize: 13 }]}>Export CSV</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.primaryButton, { flex: 1, backgroundColor: primaryAccent, paddingVertical: 14 }]}
                onPress={() => handleExportData('json')}
                disabled={isExporting}
              >
                <Feather name="file-text" size={16} color="#FFF" />
                <Text style={[styles.primaryButtonText, { fontSize: 13 }]}>Export JSON</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* --- DATABASE 3: RESEARCHER TRIAGE & BACKLOG QUEUE MODAL --- */}
        <Modal visible={isTriageVisible} animationType="slide" presentationStyle="pageSheet">
          <View style={[styles.modalContainer, { backgroundColor: bgColor }]}>
            <View style={[styles.modalHeader, { backgroundColor: cardColor }]}>
              <View>
                <Text style={[styles.modalTitle, { color: textColorPrimary }]}>Researcher Triage Queue</Text>
                <Text style={[styles.headerSubtitle, { color: textColorSecondary, marginTop: 2 }]}>
                  Database 3: {pendingTriageCount} Pending / {triageTickets.length} Total Tickets
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsTriageVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close-circle" size={30} color={textColorSecondary} />
              </TouchableOpacity>
            </View>

            {/* Search Filter Bar */}
            <View style={styles.searchContainer}>
              <View style={[styles.searchBox, { backgroundColor: inputBgColor }]}>
                <Feather name="search" size={20} color={textColorSecondary} style={{ marginRight: 10 }} />
                <TextInput 
                  style={[styles.searchInput, { color: textColorPrimary }]} 
                  placeholder="Filter by domain, URL, or reason..." 
                  placeholderTextColor={textColorSecondary} 
                  value={triageSearch} 
                  onChangeText={setTriageSearch} 
                />
                {triageSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setTriageSearch('')}>
                    <Feather name="x" size={18} color={textColorSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Filter Chips */}
            <View style={{ flexDirection: 'row', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4, gap: 8 }}>
              {(['all', 'pending', 'high', 'resolved'] as const).map((filterKey) => {
                const isActive = triageFilter === filterKey;
                const label = filterKey === 'all' ? `All (${triageTickets.length})` 
                  : filterKey === 'pending' ? `Pending (${pendingTriageCount})`
                  : filterKey === 'high' ? `High Priority (${triageTickets.filter(t => t.priority === 'HIGH' && t.status === 'pending').length})`
                  : `Resolved (${resolvedTriageCount})`;
                return (
                  <TouchableOpacity
                    key={filterKey}
                    onPress={() => setTriageFilter(filterKey)}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 12,
                      borderRadius: 14,
                      backgroundColor: isActive 
                        ? (filterKey === 'high' ? dangerAccent : (filterKey === 'resolved' ? successAccent : (isDark ? '#4DA8DA' : '#1E3246'))) 
                        : (isDark ? '#233240' : '#E2E8F0'),
                    }}
                  >
                    <Text style={{ 
                      fontSize: 11, 
                      fontWeight: '700', 
                      color: isActive ? '#FFFFFF' : textColorSecondary 
                    }}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {actionFeedback && (
              <View style={{ marginHorizontal: 20, marginTop: 10, padding: 12, borderRadius: 12, backgroundColor: 'rgba(16, 185, 129, 0.15)', borderWidth: 1, borderColor: successAccent, flexDirection: 'row', alignItems: 'center' }}>
                <Feather name="check-circle" size={16} color={successAccent} style={{ marginRight: 8 }} />
                <Text style={{ color: successAccent, fontSize: 13, fontWeight: '700', flex: 1 }}>{actionFeedback}</Text>
                <TouchableOpacity onPress={() => setActionFeedback(null)}>
                  <Feather name="x" size={14} color={successAccent} />
                </TouchableOpacity>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
              {filteredTriageTickets.length === 0 ? (
                <Text style={{ color: textColorSecondary, textAlign: 'center', marginTop: 40, fontSize: 16 }}>
                  {triageSearch ? 'No triage tickets match your search.' : 'Backlog is clean! No tickets match this filter.'}
                </Text>
              ) : (
                filteredTriageTickets.map((ticket) => (
                  <View 
                    key={ticket.id} 
                    style={[
                      styles.userCard, 
                      { 
                        backgroundColor: cardColor, 
                        borderLeftWidth: 4, 
                        borderLeftColor: ticket.status === 'resolved' ? successAccent : (ticket.priority === 'HIGH' ? dangerAccent : warningAccent) 
                      }
                    ]}
                  >
                    <View style={styles.userInfoRow}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={[styles.userName, { color: textColorPrimary }]} numberOfLines={1}>
                          {ticket.domain}
                        </Text>
                        <Text style={[styles.userEmail, { color: textColorSecondary }]} numberOfLines={2}>
                          {ticket.url}
                        </Text>
                        <TouchableOpacity 
                          style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, alignSelf: 'flex-start' }}
                          onPress={() => handleCopyLink(ticket.url)}
                          activeOpacity={0.7}
                        >
                          <Feather 
                            name={copiedUrl === ticket.url ? "check" : "copy"} 
                            size={12} 
                            color={copiedUrl === ticket.url ? successAccent : (isDark ? '#4DA8DA' : '#0284C7')} 
                            style={{ marginRight: 4 }}
                          />
                          <Text style={{ fontSize: 11, fontWeight: '600', color: copiedUrl === ticket.url ? successAccent : (isDark ? '#4DA8DA' : '#0284C7') }}>
                            {copiedUrl === ticket.url ? "Copied Link!" : "Copy Link"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      
                      <View style={{ backgroundColor: ticket.priority === 'HIGH' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                        <Text style={{ color: ticket.priority === 'HIGH' ? dangerAccent : warningAccent, fontSize: 10, fontWeight: 'bold' }}>
                          🚩 REPORTED {ticket.reportCount || 1}X
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.divider, { backgroundColor: isDark ? '#2D4356' : '#F2F0E4', marginVertical: 10 }]} />

                    <Text style={{ color: textColorPrimary, fontSize: 12, marginBottom: 4 }}>
                      Reasons: <Text style={{ color: textColorSecondary }}>{(ticket.reasons || []).join(', ') || 'User Flagged'}</Text>
                    </Text>
                    {ticket.initialVerdict && (
                      <Text style={{ color: textColorSecondary, fontSize: 11, marginBottom: 8 }}>
                        Initial AI Verdict: <Text style={{ color: textColorPrimary, fontWeight: '600' }}>{ticket.initialVerdict}</Text>
                      </Text>
                    )}

                    {ticket.status === 'resolved' ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, flexWrap: 'wrap', gap: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                          <Feather name="check-circle" size={14} color={successAccent} />
                          <Text style={{ color: successAccent, fontSize: 12, fontWeight: 'bold' }}>
                            Promoted to DB 1 ({ticket.resolution || 'Resolved'})
                          </Text>
                        </View>
                        <TouchableOpacity 
                          onPress={() => handleOpenClassEditorForTriage(ticket)}
                          style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: isDark ? '#233240' : '#F1F5F9', flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        >
                          <Feather name="edit-3" size={12} color={isDark ? '#4DA8DA' : '#0284C7'} />
                          <Text style={{ fontSize: 11, fontWeight: '600', color: isDark ? '#4DA8DA' : '#0284C7' }}>Re-Classify</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                        <TouchableOpacity 
                          style={[styles.halfButton, { flex: 1, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: successAccent, padding: 10 }]}
                          onPress={() => handleResolveTriage(ticket, 'Safe')}
                        >
                          <Feather name="shield" size={13} color={successAccent} />
                          <Text style={[styles.halfButtonText, { color: successAccent, fontSize: 11 }]}>Safe</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={[styles.halfButton, { flex: 1, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: dangerAccent, padding: 10 }]}
                          onPress={() => handleResolveTriage(ticket, 'Phishing')}
                        >
                          <Feather name="alert-triangle" size={13} color={dangerAccent} />
                          <Text style={[styles.halfButtonText, { color: dangerAccent, fontSize: 11 }]}>Phishing</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={[styles.halfButton, { flex: 1.2, backgroundColor: isDark ? '#233240' : '#E2E8F0', borderColor: isDark ? '#4DA8DA' : '#0284C7', padding: 10 }]}
                          onPress={() => handleOpenClassEditorForTriage(ticket)}
                        >
                          <Feather name="tag" size={13} color={isDark ? '#4DA8DA' : '#0284C7'} />
                          <Text style={[styles.halfButtonText, { color: isDark ? '#4DA8DA' : '#0284C7', fontSize: 11 }]}>Classify & Edit</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </Modal>

        {/* --- CLASSIFICATION & SECURITY CATEGORY EDITOR MODAL --- */}
        <Modal visible={isClassModalVisible} animationType="fade" transparent={true}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{ backgroundColor: cardColor, width: '100%', maxWidth: 520, borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 }}>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialCommunityIcons name="shield-edit-outline" size={24} color={editVerdict === 'Safe' ? successAccent : dangerAccent} />
                  <Text style={{ fontSize: 18, fontWeight: '800', color: textColorPrimary }}>
                    {classTarget?.isFromTriageTicket ? 'Classify & Promote Link' : 'Edit Link Classification'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setIsClassModalVisible(false)}>
                  <Ionicons name="close" size={22} color={textColorSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 12, color: textColorSecondary, marginBottom: 14 }}>
                Configure ground-truth classification in Database 1. Mobile scanners will prioritize this verdict and category.
              </Text>

              {/* Target Domain & URL Info */}
              <View style={{ backgroundColor: inputBgColor, padding: 12, borderRadius: 14, marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: textColorPrimary }} numberOfLines={1}>
                  {classTarget?.domain}
                </Text>
                <Text style={{ fontSize: 11, color: textColorSecondary, marginTop: 2 }} numberOfLines={2}>
                  {classTarget?.url}
                </Text>
              </View>

              {/* 1. Verdict Toggle */}
              <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: textColorSecondary, marginBottom: 8 }}>
                SECURITY VERDICT
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                <TouchableOpacity
                  onPress={() => {
                    setEditVerdict('Safe');
                    if (editCategory === 'Credential Harvesting' || editCategory === 'Financial / Bank Spoof' || editCategory === 'Malware Distribution' || editCategory === 'Brand Impersonation') {
                      setEditCategory('Legitimate Corporate');
                    }
                  }}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 12,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: editVerdict === 'Safe' ? successAccent : 'transparent',
                    backgroundColor: editVerdict === 'Safe' ? 'rgba(16, 185, 129, 0.18)' : (isDark ? '#233240' : '#E2E8F0'),
                    gap: 6
                  }}
                >
                  <Feather name="shield" size={16} color={editVerdict === 'Safe' ? successAccent : textColorSecondary} />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: editVerdict === 'Safe' ? successAccent : textColorSecondary }}>
                    SAFE (Whitelist)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setEditVerdict('Phishing');
                    if (editCategory === 'Academic Portal' || editCategory === 'Legitimate Corporate' || editCategory === 'Government / Utility' || editCategory === 'General Safe Domain') {
                      setEditCategory('Credential Harvesting');
                    }
                  }}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 12,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: editVerdict === 'Phishing' ? dangerAccent : 'transparent',
                    backgroundColor: editVerdict === 'Phishing' ? 'rgba(239, 68, 68, 0.18)' : (isDark ? '#233240' : '#E2E8F0'),
                    gap: 6
                  }}
                >
                  <Feather name="alert-triangle" size={16} color={editVerdict === 'Phishing' ? dangerAccent : textColorSecondary} />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: editVerdict === 'Phishing' ? dangerAccent : textColorSecondary }}>
                    PHISHING (Blacklist)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 2. Security Category / Class Presets */}
              <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: textColorSecondary, marginBottom: 8 }}>
                THREAT TAXONOMY / CLASS
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {(editVerdict === 'Phishing' 
                  ? [
                      'Credential Harvesting',
                      'Financial / Bank Spoof',
                      'Brand Impersonation',
                      'Malware Distribution',
                      'Account Takeover',
                      'Custom'
                    ]
                  : [
                      'Academic Portal',
                      'Official Financial/Bank',
                      'Government / Utility',
                      'Legitimate Corporate',
                      'General Safe Domain',
                      'Custom'
                    ]
                ).map((cat) => {
                  const isSelected = editCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setEditCategory(cat)}
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 10,
                        borderRadius: 10,
                        backgroundColor: isSelected ? (isDark ? '#4DA8DA' : '#1E3246') : (isDark ? '#233240' : '#E2E8F0'),
                        borderWidth: 1,
                        borderColor: isSelected ? (isDark ? '#38BDF8' : '#0284C7') : 'transparent'
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: isSelected ? '#FFFFFF' : textColorSecondary }}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Custom Category Input if selected */}
              {editCategory === 'Custom' && (
                <TextInput
                  style={[styles.inputBox, { backgroundColor: inputBgColor, color: textColorPrimary, height: 44, marginBottom: 14, fontSize: 13 }]}
                  placeholder="Enter custom taxonomy class (e.g. Crypto Drainer)..."
                  placeholderTextColor={textColorSecondary}
                  value={editCustomCategory}
                  onChangeText={setEditCustomCategory}
                />
              )}

              {/* 3. Analyst Notes */}
              <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: textColorSecondary, marginBottom: 6 }}>
                RESEARCHER AUDIT NOTES
              </Text>
              <TextInput
                style={[styles.inputBox, { backgroundColor: inputBgColor, color: textColorPrimary, height: 50, marginBottom: 18, fontSize: 13 }]}
                placeholder="Optional audit justification..."
                placeholderTextColor={textColorSecondary}
                value={editNotes}
                onChangeText={setEditNotes}
              />

              {/* Modal Action Buttons */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={[styles.halfButton, { flex: 1, backgroundColor: isDark ? '#233240' : '#E2E8F0', borderColor: 'transparent' }]}
                  onPress={() => setIsClassModalVisible(false)}
                  disabled={isSavingClass}
                >
                  <Text style={[styles.halfButtonText, { color: textColorSecondary }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.halfButton, { flex: 1.5, backgroundColor: editVerdict === 'Safe' ? successAccent : dangerAccent, borderColor: 'transparent' }]}
                  onPress={handleSaveClassification}
                  disabled={isSavingClass}
                >
                  {isSavingClass ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Feather name="check-circle" size={15} color="#FFF" />
                      <Text style={[styles.halfButtonText, { color: '#FFF' }]}>
                        {classTarget?.isFromTriageTicket ? 'Promote to DB 1' : 'Save Changes'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 40, marginBottom: 30 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginRight: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 3 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#1E3246' },
  headerSubtitle: { fontSize: 14, color: '#606A75', marginTop: 2 },
  
  scrollContent: { paddingHorizontal: 24, paddingBottom: 130 },
  
  card: { borderRadius: 24, padding: 24, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 10, letterSpacing: 0.5 },
  terminalCard: { borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#2D4356' },
  terminalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#2D4356', paddingBottom: 10 },
  terminalTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 2, marginLeft: 8 },
  terminalBody: { maxHeight: 120 },
  terminalLine: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 11, marginBottom: 6, lineHeight: 16 },
  inputBox: { height: 55, borderRadius: 16, paddingHorizontal: 20, fontSize: 15, fontWeight: '500' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  halfButton: { flex: 0.48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, borderWidth: 1 },
  halfButtonText: { fontSize: 13, fontWeight: 'bold', marginLeft: 8 },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 16 },
  primaryButtonText: { color: '#FFF', fontSize: 15, fontWeight: 'bold', marginLeft: 10, letterSpacing: 0.5 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  toggleTextContainer: { flex: 1, paddingRight: 20 },
  toggleTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  toggleSubtitle: { fontSize: 12, lineHeight: 18 },
  divider: { height: 1, marginVertical: 10 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  statBox: { flex: 0.48, borderRadius: 16, padding: 18, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 5 },
  statValue: { fontSize: 24, fontWeight: 'bold' },
  
  // MODAL STYLES
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: 'rgba(150,150,150,0.1)' },
  modalTitle: { fontSize: 24, fontWeight: '800' },
  closeBtn: { padding: 5 },
  searchContainer: { padding: 20, paddingBottom: 0 },
  searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, height: 50, borderRadius: 25 },
  searchInput: { flex: 1, fontSize: 16 },
  
  userCard: { borderRadius: 20, padding: 20, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  userInfoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  userAvatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  userAvatarText: { fontSize: 20, fontWeight: 'bold' },
  userDetails: { flex: 1 },
  userName: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  userEmail: { fontSize: 13, marginBottom: 4 },
  userRole: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  editBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 15 },
  editBtnText: { fontSize: 13, fontWeight: 'bold', marginLeft: 6 },
  expandedActions: { marginTop: 15, padding: 15, borderRadius: 15 },
  actionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
  actionGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtn: { flex: 1, paddingVertical: 10, borderWidth: 1.5, borderRadius: 12, alignItems: 'center', marginHorizontal: 4 },
  actionBtnText: { fontSize: 12, fontWeight: 'bold' }
});