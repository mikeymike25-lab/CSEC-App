import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform, StatusBar } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TabIcon = ({ name, label, focused }: { name: any, label: string, focused: boolean }) => {
  return (
    <View style={[styles.tabItem, focused && styles.tabItemFocused]}>
      <MaterialCommunityIcons 
        name={name} 
        size={24} 
        color={focused ? '#FFFFFF' : '#8A9AA9'} 
      />
      <Text style={[styles.tabLabel, { color: focused ? '#FFFFFF' : '#8A9AA9' }]}>
        {label}
      </Text>
    </View>
  );
};

export default function TabLayout() {
  const insets = useSafeAreaInsets(); 

  return (
    <>
      {/* --- This forces the battery/time text to be dark! --- */}
      <StatusBar barStyle="dark-content" backgroundColor="#FBFBF9" />
      
      <Tabs
        screenOptions={{
          tabBarShowLabel: false, 
          headerTitle: 'C-SEC',
          headerTitleAlign: 'left',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 22,
            letterSpacing: 1,
            color: '#000000',
          },
          headerStyle: {
            backgroundColor: '#FBFBF9',
            elevation: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
          },
          tabBarItemStyle: {
            flex: 1, 
            justifyContent: 'center',
            alignItems: 'center',
          },
          tabBarStyle: {
            backgroundColor: '#FBFBF9',
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
            shadowOpacity: 0.1,
            shadowRadius: 5,
            paddingHorizontal: 15, 
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ focused }) => (
              <TabIcon name="view-dashboard-outline" label="HOME" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="scan"
          options={{
            title: 'Scan',
            tabBarIcon: ({ focused }) => (
              <TabIcon name="link-variant" label="SCAN" focused={focused} /> 
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
            tabBarIcon: ({ focused }) => (
              <TabIcon name="history" label="HISTORY" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ focused }) => (
              <TabIcon name="account-outline" label="PROFILE" focused={focused} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 50, 
    minWidth: 70, 
    borderRadius: 25, 
    paddingHorizontal: 8,
  },
  tabItemFocused: {
    backgroundColor: '#1E3246', 
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2, 
    fontWeight: '700',
  },
});