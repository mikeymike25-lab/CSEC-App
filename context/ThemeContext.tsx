import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ThemeContextType {
  themePreference: string;
  isDark: boolean;
  updateTheme: (newTheme: string) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemColorScheme = useColorScheme();
  const [themePreference, setThemePreference] = useState('system');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('@csec_theme');
        if (savedTheme) {
          setThemePreference(savedTheme);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsReady(true);
      }
    };
    loadTheme();
  }, [systemColorScheme]);

  const isDark = themePreference === 'dark' || (themePreference === 'system' && systemColorScheme === 'dark');

  const updateTheme = async (newTheme: string) => {
    setThemePreference(newTheme);
    try {
      await AsyncStorage.setItem('@csec_theme', newTheme);
    } catch (error) {
      console.error(error);
    }
  };

  if (!isReady) return null;

  return (
    <ThemeContext.Provider value={{ themePreference, isDark, updateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};