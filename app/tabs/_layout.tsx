import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router'; 
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, StatusBar, StyleSheet, Text, View } from 'react-native'; // <-- Added ActivityIndicator
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// --- FIREBASE IMPORTS ---
import { doc, getDoc, onSnapshot } from 'firebase/firestore'; 
import { onAuthStateChanged, signOut } from 'firebase/auth'; 
import { auth, db } from '../../firebaseConfig';

// --- IMPORT THE THEME TOWER ---
import { useTheme } from '../../context/ThemeContext';

// --- CUSTOM ANIMATED HEADER LOGO ---
const AnimatedHeaderLogo = ({ isDark, isReduceMotion }: { isDark: boolean, isReduceMotion: boolean }) => {
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isReduceMotion) {
      cursorOpacity.setValue(1);
      return;
    }
    
    // Hardware-Accelerated Terminal Blink
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0,
          duration: 100, 
          useNativeDriver: true,
        }),
        Animated.delay(400), 
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 100, 
          useNativeDriver: true,
        }),
        Animated.delay(400) 
      ])
    );
    
    animation.start();
    
    return () => animation.stop();
  }, [cursorOpacity, isReduceMotion]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text style={[styles.headerLogoText, { color: isDark ? '#FFFFFF' : '#000000' }]}>CSEC</Text>
      <Animated.Text style={[styles.headerLogoText, { color: isDark ? '#4DA8DA' : '#2D4356', opacity: cursorOpacity }]}>_</Animated.Text>
    </View>
  );
};

const TabIcon = ({ name, label, focused, isDark }: { name: any, label: string, focused: boolean, isDark: boolean }) => {
  // Define active color for the focused pill
  const activePillColor = isDark ? '#4DA8DA' : '#1E3246';
  const inactiveTextColor = isDark ? '#606A75' : '#8A9AA9';

  // Animation value
  const scaleAnim = useRef(new Animated.Value(focused ? 1.1 : 1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: focused ? 1.15 : 1,
      friction: 6,
      tension: 120,
      useNativeDriver: true,
    }).start();
  }, [focused]);

  return (
    <Animated.View style={[
      styles.tabItem, 
      focused && { backgroundColor: activePillColor },
      { transform: [{ scale: scaleAnim }] }
    ]}>
      <MaterialCommunityIcons 
        name={name} 
        size={24} 
        color={focused ? '#FFFFFF' : inactiveTextColor} 
      />
      <Text style={[styles.tabLabel, { color: focused ? '#FFFFFF' : inactiveTextColor }]}>
        {label}
      </Text>
    </Animated.View>
  );
};

export default function TabLayout() {
  const insets = useSafeAreaInsets(); 
  const { isDark, isReduceMotion } = useTheme();
  const router = useRouter();

  // --- ADMIN STATE LOGIC ---
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingRole, setIsCheckingRole] = useState(true);

  // 1. Initial Check for Admin Tabs
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const tokenResult = await user.getIdTokenResult();
          let isUserAdmin = tokenResult.claims.admin === true;
          if (!isUserAdmin) {
            const userSnap = await getDoc(doc(db, 'users', user.uid));
            if (userSnap.exists() && userSnap.data()?.role === 'admin') {
              isUserAdmin = true;
            }
          }
          setIsAdmin(isUserAdmin);
        } catch (error) {
          console.error("Layout Admin Claims Check Error:", error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setIsCheckingRole(false);
    });
    return () => unsub();
  }, []);

  // --- 2. GLOBAL DIRECTIVE: MAINTENANCE LOCKDOWN LISTENER ---
  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, 'system', 'config'), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        if (data.maintenanceMode === true) {
          const user = auth.currentUser;
          if (user) {
            try {
              // Always verify cryptographically signed claims or Firestore admin role
              const tokenResult = await user.getIdTokenResult();
              let isUserAdmin = tokenResult.claims.admin === true;
              if (!isUserAdmin) {
                const userSnap = await getDoc(doc(db, 'users', user.uid));
                if (userSnap.exists() && userSnap.data()?.role === 'admin') {
                  isUserAdmin = true;
                }
              }
              
              if (!isUserAdmin) {
                // If they are not an admin, instantly log them out and kick them to the login screen
                Alert.alert(
                  "SYSTEM LOCKDOWN",
                  "The network has been placed in maintenance mode. Your session has been terminated by the System Administrator.",
                  [{ text: "Understood" }]
                );
                
                await signOut(auth);
                router.replace('/'); 
              }
            } catch (err) {
              console.error("Lockdown check error:", err);
            }
          }
        }
      }
    }, (error) => {
      console.warn("System Config Lockdown Stream blocked:", error.code);
    });

    return () => unsubConfig();
  }, []);

  // Define dynamic navigation colors
  const barBgColor = isDark ? '#1A242E' : '#FBFBF9';
  const headerBgColor = isDark ? '#1A242E' : '#FBFBF9'; 
  const headerTextColor = isDark ? '#FFFFFF' : '#000000';

  // --- THE FIX: Smooth Loading Screen Instead of Null ---
  if (isCheckingRole) {
    return (
      <View style={{ flex: 1, backgroundColor: headerBgColor, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={isDark ? '#4DA8DA' : '#2D4356'} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#121A21' : '#F9F7E8' }}>
      {/* --- Dynamic Status Bar --- */}
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"} 
        backgroundColor={headerBgColor} 
      />
      
      <Tabs
        screenOptions={{
          sceneStyle: { backgroundColor: isDark ? '#121A21' : '#F9F7E8' },
          animation: isReduceMotion ? 'none' : 'fade',
          tabBarShowLabel: false, 
          headerTitle: () => <AnimatedHeaderLogo isDark={isDark} isReduceMotion={isReduceMotion} />, 
          headerTitleAlign: 'left',
          headerStyle: {
            backgroundColor: headerBgColor, 
            elevation: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.3 : 0.1,
            shadowRadius: 4,
          },
          tabBarItemStyle: {
            flex: 1, 
            justifyContent: 'center',
            alignItems: 'center',
          },
          tabBarStyle: {
            backgroundColor: barBgColor, 
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 75 + insets.bottom, 
            paddingBottom: insets.bottom > 0 ? insets.bottom : 10, 
            paddingTop: 10, 
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
            borderTopWidth: 0,
            elevation: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: isDark ? 0.4 : 0.1,
            shadowRadius: 5,
            paddingHorizontal: 15, 
          },
        }}
      >
        {/* --- VISIBLE TABS --- */}
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ focused }) => (
              <TabIcon name="view-dashboard-outline" label="HOME" focused={focused} isDark={isDark} />
            ),
          }}
        />
        <Tabs.Screen
          name="scan"
          options={{
            title: 'Scan',
            tabBarIcon: ({ focused }) => (
              <TabIcon name="link-variant" label="SCAN" focused={focused} isDark={isDark} /> 
            ),
          }}
        />
        <Tabs.Screen
          name="gemini"
          options={{
            title: 'Chatbot',
            tabBarIcon: ({ focused }) => (
              <TabIcon name="chat-processing-outline" label="CHATBOT" focused={focused} isDark={isDark} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
            tabBarIcon: ({ focused }) => (
              <TabIcon name="history" label="HISTORY" focused={focused} isDark={isDark} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ focused }) => (
              <TabIcon name="account-outline" label="PROFILE" focused={focused} isDark={isDark} />
            ),
          }}
        />

        {/* --- HIDDEN TABS --- */}
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  // --- HEADER LOGO STYLES ---
  headerLogoText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
  },

  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 50, 
    minWidth: 70, 
    borderRadius: 25, 
    paddingHorizontal: 8,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2, 
    fontWeight: '700',
  },
});