/**
 * Design system tokens based on 03_DESIGN_SYSTEM.md
 */

export const COLORS = {
  primary: '#0052CC',
  primaryLight: '#F0F4FF',
  danger: '#CC0000',
  dangerLight: '#FFF0F0',
  warning: '#E87722',
  success: '#00875A',
  successLight: '#F0FFF8',
  background: '#FAFAFA',
  surface: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  textMuted: '#AAAAAA',
  border: '#EBEBEB',
};

export const LAYOUT = {
  radiusLarge: 32,
  radiusMedium: 16,
  radiusSmall: 12,
  radiusXSmall: 8,
  spacing: (factor: number) => factor * 4,
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
};
