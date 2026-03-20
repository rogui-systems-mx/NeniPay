import { Tabs, useRouter } from 'expo-router';
import {
  AlertCircle, Package, Settings, TrendingUp, Users,
  LayoutDashboard, CreditCard, ShoppingBag, BarChart3
} from 'lucide-react-native';
import React, { useEffect } from 'react';
import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, View } from 'react-native';
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
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary + '80',
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontFamily: 'Manrope_800ExtraBold',
          fontSize: 10,
          marginTop: -5,
          marginBottom: 10,
        },
        tabBarStyle: {
          backgroundColor: isDark ? '#070709' : '#FFFFFF',
          borderTopColor: colors.glassBorder,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 90 : 75,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="clientes"
        options={{
          title: 'Clientes',
          tabBarIcon: ({ color, size }) => <Users color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="pendientes"
        options={{
          title: 'Cobros',
          tabBarIcon: ({ color, size }) => <CreditCard color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="productos"
        options={{
          title: 'Catálogo',
          tabBarIcon: ({ color, size }) => <ShoppingBag color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="ajustes"
        options={{
          title: 'Mi Perfil',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={24} />,
        }}
      />
      <Tabs.Screen name="estadisticas" options={{ href: null }} />
      <Tabs.Screen name="two" options={{ href: null }} />
    </Tabs>
  );
}
