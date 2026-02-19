import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

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
  const { colors, isDark } = useTheme();

  // If fonts aren't loaded, we still need to render the provider chain
  // but we can delay the Stack rendering to avoid broken UI
  if (!loaded) return null;

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
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
      </Stack>
    </ThemeProvider>
  );
}
