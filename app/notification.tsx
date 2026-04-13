import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// --- THEME CONTEXT ---
import { useTheme } from '../context/ThemeContext';

// --- FIXED TYPE ERROR HERE ---
// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true, // <-- Fixes the TS Error
    shouldShowList: true,   // <-- Fixes the TS Error
  }),
});

export default function NotificationScreen() {
  const router = useRouter();
  const { isDark } = useTheme();

  // --- NOTIFICATION STATES ---
  const [masterPushEnabled, setMasterPushEnabled] = useState(false);
  const [broadcastsEnabled, setBroadcastsEnabled] = useState(true);
  const [threatAlertsEnabled, setThreatAlertsEnabled] = useState(true);
  const [reportUpdatesEnabled, setReportUpdatesEnabled] = useState(true);

  // --- DYNAMIC COLORS ---
  const bgColor = isDark ? '#121A21' : '#F9F7E8';
  const cardColor = isDark ? '#1A242E' : '#FFFFFF';
  const textColorPrimary = isDark ? '#FFFFFF' : '#1E3246';
  const textColorSecondary = isDark ? '#A9B4C0' : '#8A9AA9';
  const blueAccent = '#4DA8DA';
  const warningAccent = '#F59E0B';

  // --- 1. LOAD PREFERENCES ON MOUNT ---
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const storedPrefs = await AsyncStorage.getItem('csec_notification_prefs');
        if (storedPrefs) {
          const prefs = JSON.parse(storedPrefs);
          setMasterPushEnabled(prefs.masterPushEnabled ?? false);
          setBroadcastsEnabled(prefs.broadcastsEnabled ?? true);
          setThreatAlertsEnabled(prefs.threatAlertsEnabled ?? true);
          setReportUpdatesEnabled(prefs.reportUpdatesEnabled ?? true);
        }
      } catch (error) {
        console.error("Failed to load notification preferences", error);
      }
    };
    loadPreferences();
  }, []);

  // --- 2. SAVE PREFERENCES ---
  const savePreferences = async (newPrefs: any) => {
    try {
      await AsyncStorage.setItem('csec_notification_prefs', JSON.stringify(newPrefs));
    } catch (error) {
      console.error("Failed to save notification preferences", error);
    }
  };

  // --- 3. PERMISSION HANDLER ---
  const toggleMasterPush = async (value: boolean) => {
    if (value) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        Alert.alert('Permission Denied', 'You must enable notifications in your device settings to receive C-SEC alerts.');
        setMasterPushEnabled(false);
        return;
      }
    }
    
    setMasterPushEnabled(value);
    savePreferences({
      masterPushEnabled: value,
      broadcastsEnabled,
      threatAlertsEnabled,
      reportUpdatesEnabled
    });

    if (value) {
      // Send a test notification to prove it works!
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "C-SEC Sentinel",
          body: "Push notifications successfully linked to device.",
          sound: true,
        },
        trigger: null, // Send immediately
      });
    }
  };

  const handleToggle = (key: string, value: boolean) => {
    if (!masterPushEnabled && value) {
      Alert.alert("Notice", "Please enable Master Push Notifications first.");
      return;
    }

    let newPrefs = { masterPushEnabled, broadcastsEnabled, threatAlertsEnabled, reportUpdatesEnabled };
    
    if (key === 'broadcasts') { setBroadcastsEnabled(value); newPrefs.broadcastsEnabled = value; }
    if (key === 'threats') { setThreatAlertsEnabled(value); newPrefs.threatAlertsEnabled = value; }
    if (key === 'reports') { setReportUpdatesEnabled(value); newPrefs.reportUpdatesEnabled = value; }

    savePreferences(newPrefs);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bgColor }]}>
      <View style={styles.container}>
        
        {/* --- HEADER --- */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: cardColor }]} 
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={24} color={textColorPrimary} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: textColorPrimary }]}>Notifications</Text>
            <Text style={[styles.headerSubtitle, { color: textColorSecondary }]}>Manage your device alerts.</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* MASTER TOGGLE */}
          <View style={[styles.card, { backgroundColor: cardColor, borderColor: blueAccent, borderWidth: masterPushEnabled ? 1 : 0 }]}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleTextContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <MaterialCommunityIcons name="bell-ring" size={20} color={masterPushEnabled ? blueAccent : textColorSecondary} style={{ marginRight: 8 }} />
                  <Text style={[styles.toggleTitle, { color: textColorPrimary }]}>Push Notifications</Text>
                </View>
                <Text style={[styles.toggleSubtitle, { color: textColorSecondary }]}>Allow C-SEC to send alerts to your device.</Text>
              </View>
              <Switch
                trackColor={{ false: isDark ? "#2D4356" : "#D1D5DB", true: blueAccent }}
                thumbColor={"#FFFFFF"}
                onValueChange={toggleMasterPush}
                value={masterPushEnabled}
              />
            </View>
          </View>

          {/* SPECIFIC ALERTS */}
          <View style={[styles.card, { backgroundColor: cardColor, opacity: masterPushEnabled ? 1 : 0.5 }]}>
            <Text style={styles.sectionLabel}>SYSTEM ALERTS</Text>

            <View style={styles.toggleRow}>
              <View style={styles.toggleTextContainer}>
                <Text style={[styles.toggleTitle, { color: textColorPrimary }]}>Global Broadcasts</Text>
                <Text style={[styles.toggleSubtitle, { color: textColorSecondary }]}>Emergency announcements from System Admins.</Text>
              </View>
              <Switch
                trackColor={{ false: isDark ? "#2D4356" : "#D1D5DB", true: warningAccent }}
                thumbColor={"#FFFFFF"}
                onValueChange={(val) => handleToggle('broadcasts', val)}
                value={broadcastsEnabled}
                disabled={!masterPushEnabled}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: isDark ? '#2D4356' : '#F2F0E4' }]} />

            <View style={styles.toggleRow}>
              <View style={styles.toggleTextContainer}>
                <Text style={[styles.toggleTitle, { color: textColorPrimary }]}>Threat Detections</Text>
                <Text style={[styles.toggleSubtitle, { color: textColorSecondary }]}>Alerts when a scan intercepts a Phishing attempt.</Text>
              </View>
              <Switch
                trackColor={{ false: isDark ? "#2D4356" : "#D1D5DB", true: "#EF4444" }} // Red for threats
                thumbColor={"#FFFFFF"}
                onValueChange={(val) => handleToggle('threats', val)}
                value={threatAlertsEnabled}
                disabled={!masterPushEnabled}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: isDark ? '#2D4356' : '#F2F0E4' }]} />

            <View style={styles.toggleRow}>
              <View style={styles.toggleTextContainer}>
                <Text style={[styles.toggleTitle, { color: textColorPrimary }]}>Report Updates</Text>
                <Text style={[styles.toggleSubtitle, { color: textColorSecondary }]}>Get notified when an Admin reviews your submitted bug report.</Text>
              </View>
              <Switch
                trackColor={{ false: isDark ? "#2D4356" : "#D1D5DB", true: "#10B981" }} // Green for success
                thumbColor={"#FFFFFF"}
                onValueChange={(val) => handleToggle('reports', val)}
                value={reportUpdatesEnabled}
                disabled={!masterPushEnabled}
              />
            </View>

          </View>

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 40, marginBottom: 20 },
  backButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 3 },
  headerTitle: { fontSize: 28, fontWeight: '800' },
  headerSubtitle: { fontSize: 14, marginTop: 2 },
  
  scrollContent: { paddingHorizontal: 24, paddingBottom: 50 },
  
  card: { borderRadius: 24, padding: 24, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 4 },
  sectionLabel: { fontSize: 10, fontWeight: '800', color: '#8A9AA9', letterSpacing: 1.5, marginBottom: 20 },
  
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  toggleTextContainer: { flex: 1, paddingRight: 20 },
  toggleTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  toggleSubtitle: { fontSize: 12, lineHeight: 18 },
  divider: { height: 1, marginVertical: 15 },
});