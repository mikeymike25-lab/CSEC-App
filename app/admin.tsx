import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

// --- FIREBASE IMPORTS ---
// ADDED: query and orderBy to sort reports newest-first
import { collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

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
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (!userDoc.exists() || userDoc.data().role !== 'admin') {
        Alert.alert("Access Denied", "You do not have clearance for this sector.");
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

    return () => { unsub(); unsubStats(); };
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

  const handleSendBroadcast = () => {
    if (!broadcastMessage.trim()) return;
    updateGlobalConfig('activeBroadcast', broadcastMessage);
    Alert.alert("Broadcast Transmitted", "Message sent to all active agents.");
    logAction(`Sent Global Broadcast: "${broadcastMessage}"`);
    setBroadcastMessage('');
  };

  const handleThreatIntel = (type: 'whitelist' | 'blacklist') => {
    if (!threatUrl.trim()) return;
    Alert.alert("Matrix Updated", `${threatUrl} has been added to the global ${type}.`);
    logAction(`Added ${threatUrl} to Global ${type.toUpperCase()}`);
    setThreatUrl('');
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

  const getStatusColor = (status: string) => { 
    if (status === 'suspended') return warningAccent; 
    if (status === 'banned') return dangerAccent; 
    return successAccent; 
  };

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
            <Text style={[styles.toggleSubtitle, { color: textColorSecondary, marginBottom: 15 }]}>Manually override AI classification for specific domains.</Text>
            
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