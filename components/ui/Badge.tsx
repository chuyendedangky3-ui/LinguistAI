import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { COLORS, LAYOUT } from '../../constants/theme';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'muted';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'primary', style, textStyle }) => {
  const getStyles = () => {
    switch (variant) {
      case 'success': return { bg: COLORS.successLight, text: COLORS.success };
      case 'warning': return { bg: '#FFF3E0', text: COLORS.warning };
      case 'danger': return { bg: COLORS.dangerLight, text: COLORS.danger };
      case 'muted': return { bg: COLORS.border, text: COLORS.textSecondary };
      default: return { bg: COLORS.primaryLight, text: COLORS.primary };
    }
  };

  const colors = getStyles();

  return (
    <View style={[styles.base, { backgroundColor: colors.bg }, style]}>
      <Text style={[styles.text, { color: colors.text }, textStyle]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: LAYOUT.radiusXSmall,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
});
