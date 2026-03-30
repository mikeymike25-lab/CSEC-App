import React, { createContext, useState, useEffect, useContext } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 1. Create the Context (The Radio Tower)
const ThemeContext = createContext<any>(null);

// 2. Create the Provider (The Broadcaster)
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemColorScheme = useColorScheme();
  const [themePreference, setThemePreference] = useState('system');
  const [isReady, setIsReady] = useState(false);

  // Load the saved preference when the app starts
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('@csec_theme');
        if (savedTheme) {
          setThemePreference(savedTheme);
        }
      } catch (error) {
        console.error("Error loading theme", error);
      } finally {
        setIsReady(true);
      }
    };
    loadTheme();
  }, []);

  // Calculate the actual current mode (dark or light)
  const isDark = themePreference === 'dark' || (themePreference === 'system' && systemColorScheme === 'dark');

  // Function to change and save the theme
  const updateTheme = async (newTheme: string) => {
    setThemePreference(newTheme);
    try {
      await AsyncStorage.setItem('@csec_theme', newTheme);
    } catch (error) {
      console.error("Error saving theme", error);
    }
  };

  // Don't broadcast until we've checked the local storage
  if (!isReady) return null;

  return (
    <ThemeContext.Provider value={{ themePreference, isDark, updateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// 3. Create a custom Hook (The Radio Receiver for your screens)
export const useTheme = () => useContext(ThemeContext);