import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Feather } from '@expo/vector-icons';

export interface PasswordStrengthResult {
  score: number; // 0 to 4
  label: string;
  color: string;
  isStrong: boolean;
  criteria: {
    length: boolean;
    upper: boolean;
    lower: boolean;
    numberOrSymbol: boolean;
  };
}

export function getPasswordStrength(password: string): PasswordStrengthResult {
  if (!password) {
    return {
      score: 0,
      label: 'Empty',
      color: '#64748B',
      isStrong: false,
      criteria: { length: false, upper: false, lower: false, numberOrSymbol: false },
    };
  }

  const length = password.length >= 8;
  const upper = /[A-Z]/.test(password);
  const lower = /[a-z]/.test(password);
  const numberOrSymbol = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);

  let metCount = 0;
  if (length) metCount++;
  if (upper) metCount++;
  if (lower) metCount++;
  if (numberOrSymbol) metCount++;

  let score = 1;
  let label = 'Weak';
  let color = '#EF4444'; // Red

  if (metCount === 2) {
    score = 2;
    label = 'Fair';
    color = '#F59E0B'; // Amber
  } else if (metCount === 3) {
    score = 3;
    label = 'Good';
    color = '#10B981'; // Green
  } else if (metCount === 4) {
    score = 4;
    label = password.length >= 10 ? 'Very Strong' : 'Strong';
    color = '#06B6D4'; // Cyan
  }

  // Minimum strong standard: at least 8 chars + upper + lower + number/symbol
  const isStrong = length && upper && lower && numberOrSymbol;

  return {
    score,
    label,
    color,
    isStrong,
    criteria: { length, upper, lower, numberOrSymbol },
  };
}

interface PasswordStrengthMeterProps {
  password: string;
}

export default function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const { isDark } = useTheme();
  const strength = getPasswordStrength(password);

  if (!password) {
    return null;
  }

  const trackBg = isDark ? '#1E293B' : '#E2E8F0';
  const textColor = isDark ? '#94A3B8' : '#64748B';

  return (
    <View style={styles.container}>
      {/* ── HEADER: RATING & LABEL ─────────────────── */}
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: textColor }]}>
          Password Security:
        </Text>
        <View style={[styles.badge, { backgroundColor: `${strength.color}20`, borderColor: strength.color }]}>
          <Text style={[styles.badgeText, { color: strength.color }]}>
            {strength.label.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* ── PROGRESSIVE 4-SEGMENT BAR ──────────────── */}
      <View style={styles.barContainer}>
        {[1, 2, 3, 4].map((step) => {
          const isActive = strength.score >= step;
          return (
            <View
              key={step}
              style={[
                styles.segment,
                {
                  backgroundColor: isActive ? strength.color : trackBg,
                  opacity: isActive ? 1 : 0.6,
                },
              ]}
            />
          );
        })}
      </View>

      {/* ── CRITERIA BADGES ────────────────────────── */}
      <View style={styles.criteriaRow}>
        <CriteriaItem
          met={strength.criteria.length}
          label="8+ Chars"
          isDark={isDark}
        />
        <CriteriaItem
          met={strength.criteria.upper}
          label="Uppercase"
          isDark={isDark}
        />
        <CriteriaItem
          met={strength.criteria.lower}
          label="Lowercase"
          isDark={isDark}
        />
        <CriteriaItem
          met={strength.criteria.numberOrSymbol}
          label="Num / Symbol"
          isDark={isDark}
        />
      </View>
    </View>
  );
}

function CriteriaItem({ met, label, isDark }: { met: boolean; label: string; isDark: boolean }) {
  const activeColor = '#10B981';
  const inactiveColor = isDark ? '#64748B' : '#94A3B8';
  const bg = met ? (isDark ? 'rgba(16, 185, 129, 0.15)' : '#DCFCE7') : (isDark ? '#1E293B' : '#F1F5F9');

  return (
    <View style={[styles.criteriaChip, { backgroundColor: bg, borderColor: met ? activeColor : 'transparent' }]}>
      <Feather
        name={met ? 'check' : 'circle'}
        size={10}
        color={met ? activeColor : inactiveColor}
        style={{ marginRight: 3 }}
      />
      <Text style={[styles.criteriaText, { color: met ? (isDark ? '#34D399' : '#065F46') : inactiveColor }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 6,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  barContainer: {
    flexDirection: 'row',
    height: 5,
    width: '100%',
    marginBottom: 8,
  },
  segment: {
    flex: 1,
    height: '100%',
    borderRadius: 3,
    marginRight: 4,
  },
  criteriaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  criteriaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  criteriaText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
