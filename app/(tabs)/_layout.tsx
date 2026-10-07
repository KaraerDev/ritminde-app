import { Redirect, Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActivityIndicator, Platform, SafeAreaView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { HapticTab } from "@/components/haptic-tab";
import { palette } from "@/components/planner/PlannerUI";
import { useAuth } from "@/lib/_core/AuthProvider";

export default function TabLayout() {
  const { user, loading } = useAuth();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 8);
  const tabBarHeight = 61 + bottomPadding;

  if (loading) return <SafeAreaView style={{ flex: 1, backgroundColor: palette.canvas }}><View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 11 }}><ActivityIndicator color={palette.pine} /><Text style={{ color: palette.muted, fontSize: 14 }}>Hesabın kontrol ediliyor…</Text></View></SafeAreaView>;
  if (!user) return <Redirect href="/auth" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.pine,
        tabBarInactiveTintColor: palette.muted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "700", marginTop: 1 },
        tabBarStyle: {
          paddingTop: 7,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: palette.canvas,
          borderTopColor: palette.line,
          borderTopWidth: 1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Gün",
          tabBarAccessibilityLabel: "Günlük plan",
          tabBarIcon: ({ color }) => <Ionicons size={22} name="sunny-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Takvim",
          tabBarAccessibilityLabel: "Gelecek plan takvimi",
          tabBarIcon: ({ color }) => <Ionicons size={22} name="calendar-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "İlerleme",
          tabBarAccessibilityLabel: "İlerleme grafikleri",
          tabBarIcon: ({ color }) => <Ionicons size={22} name="stats-chart-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Ayarlar",
          tabBarAccessibilityLabel: "Hatırlatıcı ve erişilebilirlik ayarları",
          tabBarIcon: ({ color }) => <Ionicons size={22} name="options-outline" color={color} />,
        }}
      />
    </Tabs>
  );
}
