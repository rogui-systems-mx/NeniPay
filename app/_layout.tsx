import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold
} from '@expo-google-fonts/manrope';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { LogBox, Platform } from 'react-native';
import 'react-native-reanimated';

// Ignore specific warnings related to Expo Go and Push Notifications
// since we only use Local Notifications.
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications'
]);

import { AuthProvider } from '../context/AuthContext';
import { NeniProvider } from '../context/NeniContext';
import { ThemeProvider as CustomThemeProvider, useTheme } from '../context/ThemeContext';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...(Platform.OS !== 'web' ? {
      Manrope_400Regular,
      Manrope_500Medium,
      Manrope_600SemiBold,
      Manrope_700Bold,
      Manrope_800ExtraBold,
    } : {}),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) console.error('Font loading error:', error);
    if (loaded) console.log('[RootLayout] Fonts loaded');
  }, [loaded, error]);

  useEffect(() => {
    if (loaded || error) {
      console.log('[RootLayout] Hiding splash screen...');
      SplashScreen.hideAsync().catch((e) => {
        console.warn('[RootLayout] Error hiding splash screen:', e);
      });
    }
  }, [loaded, error]);

  // Safety net: Hide splash screen after 3 seconds no matter what
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('[RootLayout] Safety timeout triggered: Hiding splash screen');
      SplashScreen.hideAsync().catch(() => { });
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <CustomThemeProvider>
      <AuthProvider>
        <NeniProvider>
          <RootLayoutNav loaded={loaded} />
        </NeniProvider>
      </AuthProvider>
    </CustomThemeProvider>
  );
}

function RootLayoutNav({ loaded }: { loaded: boolean }) {
  const theme = useTheme();
  const { colors } = theme;
  const isDarkRef = theme.isDark;

  // If fonts aren't loaded, we still need to render the provider chain
  // but we can delay the Stack rendering to avoid broken UI
  if (!loaded) return null;

  return (
    <ThemeProvider value={isDarkRef ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth/index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="cliente/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="cliente/nuevo" options={{ headerShown: false }} />
        <Stack.Screen name="producto/nuevo" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
