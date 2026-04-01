import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { auth, db } from '../../firebaseConfig';

const TabIcon = ({ name, label, focused, isDark }: { name: any, label: string, focused: boolean, isDark: boolean }) => {
  const activePillColor = isDark ? '#4DA8DA' : '#1E3246';
  const inactiveTextColor = isDark ? '#606A75' : '#8A9AA9';

  return (
    <View style={[styles.tabItem, focused && { backgroundColor: activePillColor }]}>
      <MaterialCommunityIcons name={name} size={24} color={focused ? '#FFFFFF' : inactiveTextColor} />
      <Text style={[styles.tabLabel, { color: focused ? '#FFFFFF' : inactiveTextColor }]}>{label}</Text>
    </View>
  );
};

export default function TabLayout() {
  const insets = useSafeAreaInsets(); 
  const { isDark } = useTheme();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingRole, setIsCheckingRole] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists() && userDoc.data().role === 'admin') {
            setIsAdmin(true);
          }
        } catch (error) {
          console.error("Layout Role Check Error:", error);
        }
      }
      setIsCheckingRole(false);
    };
    checkAdminStatus();
  }, []);

  const barBgColor = isDark ? '#1A242E' : '#FBFBF9';
  const headerBgColor = isDark ? '#121A21' : '#FBFBF9';
  const headerTextColor = isDark ? '#FFFFFF' : '#000000';

  if (isCheckingRole) return null;

  return (
    <>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={headerBgColor} />
      <Tabs
        screenOptions={{
          tabBarShowLabel: false, 
          headerTitle: 'C-SEC',
          headerTitleAlign: 'left',
          headerTitleStyle: { fontWeight: 'bold', fontSize: 22, letterSpacing: 1, color: headerTextColor },
          headerStyle: { backgroundColor: headerBgColor, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDark ? 0.3 : 0.1, shadowRadius: 4 },
          tabBarStyle: {
            backgroundColor: barBgColor, position: 'absolute', bottom: 0, left: 0, right: 0,
            height: 75 + insets.bottom, paddingBottom: insets.bottom > 0 ? insets.bottom : 10, paddingTop: 10, 
            borderTopLeftRadius: 30, borderTopRightRadius: 30, borderTopWidth: 0, elevation: 10,
            shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: isDark ? 0.4 : 0.1, shadowRadius: 5, paddingHorizontal: 15, 
          },
        }}
      >
        {/* VISIBLE TABS */}
        <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ focused }) => (<TabIcon name="view-dashboard-outline" label="HOME" focused={focused} isDark={isDark} />) }} />
        <Tabs.Screen name="scan" options={{ title: 'Scan', tabBarIcon: ({ focused }) => (<TabIcon name="link-variant" label="SCAN" focused={focused} isDark={isDark} />) }} />
        <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: ({ focused }) => (<TabIcon name="history" label="HISTORY" focused={focused} isDark={isDark} />) }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ focused }) => (<TabIcon name="account-outline" label="PROFILE" focused={focused} isDark={isDark} />) }} />
        
        {/* HIDDEN TABS (Registered but no button in the bar) */}
        <Tabs.Screen 
          name="admin" 
          options={{ 
            headerTitle: 'Command Center',
            tabBarButton: () => null 
          }} 
        />

        <Tabs.Screen 
          name="security" 
          options={{ 
            headerTitle: 'Security Preferences',
            tabBarButton: () => null 
          }} 
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  tabItem: { alignItems: 'center', justifyContent: 'center', height: 50, minWidth: 70, borderRadius: 25, paddingHorizontal: 8 },
  tabLabel: { fontSize: 10, marginTop: 2, fontWeight: '700' },
});