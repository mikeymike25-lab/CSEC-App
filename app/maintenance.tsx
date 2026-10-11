import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { useTheme } from '../context/ThemeContext';

export default function MaintenanceScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const [isChecking, setIsChecking] = useState(false);

  const bgColor = isDark ? '#121A21' : '#F9F7E8';
  const cardColor = isDark ? '#1A242E' : '#FFFFFF';
  const textColorPrimary = isDark ? '#FFFFFF' : '#1E3246';
  const textColorSecondary = isDark ? '#A9B4C0' : '#8A9AA9';
  const accentRed = '#EF4444';
  const accentPrimary = isDark ? '#4DA8DA' : '#2D4356';

  const handleCheckStatus = async () => {
    setIsChecking(true);
    try {
      const configSnap = await getDoc(doc(db, 'system', 'config'));
      const isMaint = configSnap.exists() && configSnap.data().maintenanceMode === true;

      if (!isMaint) {
        Alert.alert(
          "Systems Online",
          "Maintenance has concluded. Normal network operations have resumed.",
          [
            {
              text: "Enter App",
              onPress: () => {
                if (auth.currentUser) {
                  router.replace('/tabs');
                } else {
                  router.replace('/');
                }
              }
            }
          ]
        );
      } else {
        // If logged in, check if user has admin claims
        if (auth.currentUser) {
          const tokenResult = await auth.currentUser.getIdTokenResult(true);
          let isUserAdmin = tokenResult.claims.admin === true;
          if (!isUserAdmin) {
            const userSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
            if (userSnap.exists() && userSnap.data()?.role === 'admin') {
              isUserAdmin = true;
            }
          }
          if (isUserAdmin) {
            Alert.alert("Admin Verified", "Administrator bypass authorized.", [
              { text: "Enter Command Center", onPress: () => router.replace('/tabs') }
            ]);
            return;
          }
        }
        Alert.alert(
          "Maintenance Active",
          "The security network is still undergoing maintenance. Please check back shortly."
        );
      }
    } catch (err: any) {
      console.error("Maintenance check error:", err);
      Alert.alert("Connection Check", "Could not verify maintenance status. Please check your network connection.");
    } finally {
      setIsChecking(false);
    }
  };

  const handleAdminSwitch = async () => {
    try {
      if (auth.currentUser) {
        await auth.signOut();
      }
      router.replace('/');
    } catch (e) {
      console.error("Sign out error:", e);
      router.replace('/');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bgColor }]}>
      <View style={styles.container}>
        
        {/* BADGE */}
        <View style={styles.badgeContainer}>
          <View style={[styles.badge, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: accentRed }]}>
            <MaterialCommunityIcons name="alert-octagon" size={14} color={accentRed} />
            <Text style={[styles.badgeText, { color: accentRed }]}>SYSTEM LOCKDOWN ACTIVE</Text>
          </View>
        </View>

        {/* HERO ICON */}
        <View style={[styles.iconWrapper, { backgroundColor: isDark ? '#231B22' : '#FEE2E2', borderColor: accentRed }]}>
          <MaterialCommunityIcons name="shield-lock-outline" size={72} color={accentRed} />
        </View>

        {/* HEADINGS */}
        <Text style={[styles.title, { color: textColorPrimary }]}>Network Maintenance</Text>
        <Text style={[styles.subtitle, { color: textColorSecondary }]}>
          Scheduled security hardening is currently underway. Access is restricted to authorized administrative personnel.
        </Text>

        {/* DETAILS CARD */}
        <View style={[styles.card, { backgroundColor: cardColor }]}>
          <View style={styles.cardRow}>
            <MaterialCommunityIcons name="timer-sand" size={20} color={accentPrimary} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardRowTitle, { color: textColorPrimary }]}>Temporary Interruption</Text>
              <Text style={[styles.cardRowDesc, { color: textColorSecondary }]}>
                Manual scanning, real-time link interception, and Gemini assistants are temporarily paused.
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: isDark ? '#2D4356' : '#F0ECE1' }]} />

          <View style={styles.cardRow}>
            <MaterialCommunityIcons name="shield-check" size={20} color="#10B981" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardRowTitle, { color: textColorPrimary }]}>Data Integrity Protected</Text>
              <Text style={[styles.cardRowDesc, { color: textColorSecondary }]}>
                Your local scan records and credentials remain safely encrypted on your device.
              </Text>
            </View>
          </View>
        </View>

        {/* ACTIONS */}
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={[styles.primaryButton, { backgroundColor: accentPrimary }]}
            onPress={handleCheckStatus}
            disabled={isChecking}
            activeOpacity={0.8}
          >
            {isChecking ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons name="refresh" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.primaryButtonText}>RE-CHECK STATUS</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.secondaryButton, { borderColor: isDark ? '#2D4356' : '#D1D5DB' }]}
            onPress={handleAdminSwitch}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="account-key-outline" size={18} color={textColorPrimary} style={{ marginRight: 8 }} />
            <Text style={[styles.secondaryButtonText, { color: textColorPrimary }]}>ADMINISTRATOR LOG IN</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeContainer: {
    marginBottom: 24,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  iconWrapper: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 10,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardRowTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardRowDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  actionContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  secondaryButtonText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
