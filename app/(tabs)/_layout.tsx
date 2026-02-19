import { Tabs, useRouter } from 'expo-router';
import { AlertCircle, Package, Settings, TrendingUp, Users } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function TabLayout() {
  const { user, loading, isConfigured } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isConfigured && !user) {
      router.replace('/auth' as any);
    }
  }, [user, loading, isConfigured]);

  if (loading) return null;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 70,
          paddingBottom: 15,
          borderTopWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTitleStyle: {
          color: colors.text,
          fontWeight: '900',
        },
        headerShadowVisible: false,
      }}>
      <Tabs.Screen
        name="pendientes"
        options={{
          title: 'Pendientes',
          tabBarIcon: ({ color, size }) => <AlertCircle color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Clientes',
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="estadisticas"
        options={{
          title: 'Estadísticas',
          tabBarIcon: ({ color, size }) => <TrendingUp color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="productos"
        options={{
          title: 'Catálogo',
          tabBarIcon: ({ color, size }) => <Package color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="ajustes"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
      <Tabs.Screen name="two" options={{ href: null }} />
    </Tabs>
  );
}
