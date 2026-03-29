import { Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function HomeScreen() {
  const router = useRouter();

  const currentUser = auth().currentUser;
  const displayName = currentUser?.displayName || 'User';

  const handleLogout = async () => {
    try {
      await auth().signOut();
      // TypeScript strict routing fix applied here
      router.replace('/' as any);
    } catch (error: any) {
      Alert.alert('Logout Failed', error.message);
    }
  };

  const recentActivity = [
    {
      id: 1,
      type: 'safe',
      title: 'google.com',
      time: '10 mins ago',
      icon: 'checkmark-circle',
    },
    {
      id: 2,
      type: 'danger',
      title: 'secure-login-update.biz',
      time: '2 hours ago',
      icon: 'warning',
    },
    {
      id: 3,
      type: 'safe',
      title: 'github.com',
      time: '5 hours ago',
      icon: 'checkmark-circle',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9F7E8" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{displayName}</Text>
          </View>
          <TouchableOpacity style={styles.profileBtn}>
            <Ionicons name="person-circle" size={40} color="#2D4356" />
          </TouchableOpacity>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Ionicons name="shield-checkmark" size={32} color="#4CAF50" />
            <Text style={styles.statusTitle}>Device Protected</Text>
          </View>
          <Text style={styles.statusText}>
            C-SEC AI is actively monitoring your links and applications for
            phishing threats.
          </Text>
          <View style={styles.statusFooter}>
            <Text style={styles.lastScanText}>Last scan: Just now</Text>
            <TouchableOpacity style={styles.scanBtn}>
              <Text style={styles.scanBtnText}>Scan Now</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Dashboard</Text>
        <View style={styles.grid}>
          
          {/* SAFE LINKS BUTTON - Now fully wired to your new screen! */}
          <TouchableOpacity 
            style={styles.gridItem} 
            activeOpacity={0.7}
            onPress={() => router.push('/safe-links' as any)}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="link" size={28} color="#1976D2" />
            </View>
            <Text style={styles.gridText}>Safe Links</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridItem} activeOpacity={0.7}>
            <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="apps" size={28} color="#388E3C" />
            </View>
            <Text style={styles.gridText}>Trusted Apps</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridItem} activeOpacity={0.7}>
            <View style={[styles.iconContainer, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="document-text" size={28} color="#F57C00" />
            </View>
            <Text style={styles.gridText}>Scan Reports</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridItem} activeOpacity={0.7}>
            <View style={[styles.iconContainer, { backgroundColor: '#F3E5F5' }]}>
              <Ionicons name="settings-sharp" size={28} color="#7B1FA2" />
            </View>
            <Text style={styles.gridText}>Settings</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityContainer}>
          {recentActivity.map((item) => (
            <View key={item.id} style={styles.activityItem}>
              <Ionicons
                name={item.icon as any}
                size={24}
                color={item.type === 'safe' ? '#4CAF50' : '#cd382a'}
              />
              <View style={styles.activityTextContainer}>
                <Text style={styles.activityTitle}>{item.title}</Text>
                <Text style={styles.activityTime}>{item.time}</Text>
              </View>
              <Text
                style={[
                  styles.activityStatus,
                  { color: item.type === 'safe' ? '#4CAF50' : '#cd382a' },
                ]}
              >
                {item.type === 'safe' ? 'Safe' : 'Blocked'}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          activeOpacity={0.8}
          onPress={handleLogout}
        >
          <Ionicons
            name="log-out-outline"
            size={20}
            color="#FFF"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.logoutButtonText}>LOGOUT</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F7E8',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  greeting: {
    fontSize: 16,
    color: '#555',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D4356',
  },
  profileBtn: {
    padding: 5,
  },
  statusCard: {
    backgroundColor: '#2D4356',
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  statusTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  statusText: {
    color: '#D5DDE5',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  statusFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 15,
  },
  lastScanText: {
    color: '#A0B2C6',
    fontSize: 12,
  },
  scanBtn: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 15,
  },
  scanBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D4356',
    marginBottom: 15,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  gridItem: {
    width: '47%',
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  gridText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  activityContainer: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 15,
    marginBottom: 30,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  activityTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  activityTime: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  activityStatus: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#cd382a',
    flexDirection: 'row',
    height: 55,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  logoutButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});