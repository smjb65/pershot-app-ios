import React from 'react';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' }, // مخفی‌سازی کامل تب‌بار اضافی اکسپو
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="campaigns" />
      <Tabs.Screen name="directs" />
      <Tabs.Screen name="reels" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}