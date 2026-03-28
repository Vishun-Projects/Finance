import { Tabs } from 'expo-router';
import React from 'react';
import { BlurView } from 'expo-blur';
import { Platform, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/src/store/useStore';
import { Home, Compass, Wallet, PieChart } from 'lucide-react-native';

export default function TabLayout() {
  const { theme } = useAuthStore();
  const colors = Colors[theme || 'dark'];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.icon,
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0,
          backgroundColor: theme === 'dark' ? 'rgba(10, 10, 11, 0.8)' : 'rgba(255, 255, 255, 0.8)',
          height: 85,
          paddingBottom: 25,
          paddingTop: 10,
        },
        tabBarBackground: () => (
          <BlurView intensity={Platform.OS === 'ios' ? 80 : 100} tint={theme} style={StyleSheet.absoluteFill} />
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => <Home size={24} stroke={color} strokeWidth={focused ? 2.5 : 2} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color, focused }) => <PieChart size={24} stroke={color} strokeWidth={focused ? 2.5 : 2} />,
        }}
      />

    </Tabs>
  );
}

