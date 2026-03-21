const palette = {
  blue: '#2563EB', // NeniPay Logo Blue
  blueLight: '#3B82F6',
  blueDark: '#1E40AF',
  purple: '#7C3AED', // NeniPay Logo Purple
  purpleLight: '#8B5CF6',
  purpleDark: '#5B21B6',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  whatsapp: '#25D366',
  white: '#FFFFFF',
  black: '#000000',
  // Premium Background Gradients (Logo Based)
  bgGradientDark: ['#0B0B0E', '#13131A', '#0B0B0E'],
  bgGradientLight: ['#F8FAFC', '#EEF2FF', '#F1F5F9'], // Soft blue/purple tint for light theme
  // Neutrals 
  gray900: '#0F172A',
  gray800: '#1E293B',
  gray700: '#334155',
  gray600: '#475569',
  gray500: '#64748B',
  gray400: '#94A3B8',
  gray300: '#CBD5E1',
  gray200: '#E2E8F0',
  gray100: '#F1F5F9',
  gray50: '#F8FAFC',
};

export const Colors = {
  brand: palette,
  light: {
    background: '#F8FAFC',
    card: 'rgba(255, 255, 255, 0.85)', // More opaque for better readability in light theme
    cardSecondary: 'rgba(241, 245, 249, 0.92)',
    text: palette.gray900,
    textSecondary: palette.gray500,
    border: 'rgba(37, 99, 235, 0.08)', 
    primary: palette.blue,
    secondary: palette.purple,
    success: palette.success,
    danger: palette.danger,
    warning: palette.warning,
    whatsapp: palette.whatsapp,
    accent: palette.purple,
    tabBar: 'rgba(255, 255, 255, 0.9)',
    tabIconDefault: palette.gray400,
    tabIconSelected: palette.blue,
    gradientPrimary: [palette.blue, palette.purple],
    gradientSecondary: [palette.purple, '#D946EF'], 
    gradientDanger: [palette.danger, '#F97316'],
    gradientSuccess: [palette.success, '#34D399'],
    glass: 'rgba(255, 255, 255, 0.70)',
    glassBorder: 'rgba(0, 0, 0, 0.06)', 
    bgGlow1: 'rgba(37, 99, 235, 0.06)',
    bgGlow2: 'rgba(124, 58, 237, 0.06)',
  },
  dark: {
    background: '#070709', // Deeper black/blue base
    card: 'rgba(21, 21, 26, 0.7)',
    cardSecondary: 'rgba(28, 28, 36, 0.6)',
    text: palette.white,
    textSecondary: '#94A3B8', // Slate 400
    border: 'rgba(255, 255, 255, 0.08)',
    primary: '#3B82F6', // More vibrant Blue
    secondary: '#8B5CF6', // More vibrant Purple
    success: palette.success,
    danger: palette.danger,
    warning: palette.warning,
    whatsapp: palette.whatsapp,
    accent: palette.purple,
    tabBar: 'rgba(10, 10, 15, 0.95)',
    tabIconDefault: '#475569',
    tabIconSelected: '#3B82F6',
    gradientPrimary: ['#2563EB', '#7C3AED'],
    gradientSecondary: ['#7C3AED', '#C026D3'],
    gradientDanger: [palette.danger, '#F97316'],
    gradientSuccess: [palette.success, '#34D399'],
    glass: 'rgba(30, 30, 45, 0.5)',
    glassBorder: 'rgba(255, 255, 255, 0.12)',
    bgGlow1: 'rgba(37, 99, 235, 0.18)',
    bgGlow2: 'rgba(124, 58, 237, 0.18)',
  }
};

export default Colors;

