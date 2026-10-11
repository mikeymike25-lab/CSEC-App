import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface AnimatedSplashProps {
  onAnimationComplete?: () => void;
}

export default function AnimatedSplash({ onAnimationComplete }: AnimatedSplashProps) {
  const { isDark } = useTheme();
  
  // Animation Values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const scanAnim = useRef(new Animated.Value(0)).current;
  const logoPulseAnim = useRef(new Animated.Value(1)).current;

  const bgColor = isDark ? '#121A21' : '#F9F7E8';
  const textColor = isDark ? '#4DA8DA' : '#1E3246';

  useEffect(() => {
    // 1. Fade in and scale up the logo
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      })
    ]).start();

    // 2. Continuous "Scanning" pulse effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        })
      ])
    ).start();

    // 2.5 Continuous "Securing" pulse effect for the logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(logoPulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ])
    ).start();

    // 3. Trigger the completion callback after 3 seconds
    const timer = setTimeout(() => {
      if (onAnimationComplete) {
        onAnimationComplete();
      }
    }, 3000);

    // Cleanup
    return () => clearTimeout(timer);
    
  // 👇 THIS IS THE FIX. Empty array means "run once and only once".
  }, []); 

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      
      <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
        <Animated.View style={{ transform: [{ scale: logoPulseAnim }] }}>
          <Image 
            source={require('../assets/images/CSECLOGOV2.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
        
        <View style={styles.techTextContainer}>
          <MaterialCommunityIcons name="shield-sync" size={20} color={textColor} style={styles.icon} />
          <Text style={[styles.techText, { color: textColor }]}>
            SECURING ENVIRONMENT...
          </Text>
        </View>

        {/* The Scanning/Pulsing Line */}
        <Animated.View style={[
          styles.scanLine, 
          { 
            backgroundColor: textColor,
            opacity: scanAnim 
          }
        ]} />
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logo: { width: 140, height: 140, marginBottom: 40 },
  techTextContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  icon: { marginRight: 8 },
  techText: { fontSize: 12, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' },
  scanLine: { width: 200, height: 2, marginTop: 10, shadowColor: '#4DA8DA', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 10, elevation: 5 }
});