const palette = {
  blue: '#3B82F6',
  purple: '#8B5CF6',
  gold: '#FFB800',
  orange: '#FF8C00',
  success: '#10b981',
  danger: '#ef4444',
};

export const Colors = {
  brand: palette,
  light: {
    background: '#F8F9FA',
    card: '#FFFFFF',
    text: '#121214',
    textSecondary: '#64748B',
    border: '#E2E8F0',
    primary: palette.blue,
    secondary: palette.purple,
    success: palette.success,
    danger: palette.danger,
    accent: palette.purple,
    gold: palette.gold,
    tabBar: '#FFFFFF',
    tabIconDefault: '#94A3B8',
    tabIconSelected: palette.blue,
    gradientPrimary: [palette.blue, palette.purple],
    gradientSecondary: [palette.blue, palette.purple],
    gradientDanger: [palette.danger, '#f97316'],
  },
  dark: {
    background: '#0F0F12',
    card: '#1A1A22',
    text: '#FFFFFF',
    textSecondary: '#94A3B8',
    border: '#2D2D35',
    primary: palette.blue,
    secondary: palette.purple,
    success: palette.success,
    danger: palette.danger,
    accent: palette.purple,
    gold: palette.gold,
    tabBar: '#1A1A22',
    tabIconDefault: '#64748B',
    tabIconSelected: palette.blue,
    gradientPrimary: [palette.blue, palette.purple],
    gradientSecondary: [palette.blue, palette.purple],
    gradientDanger: [palette.danger, '#f97316'],
  }
};

export default Colors;
