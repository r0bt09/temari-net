import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TEMARI_COLORS } from "@/constants/temari";
import { useTemari } from "@/lib/temari/TemariProvider";

const icons = {
  index: "map-outline",
  read: "book-outline",
  ai: "chatbubble-ellipses-outline",
  leaderboard: "trophy-outline",
  rewards: "gift-outline",
} as const;

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { ready, user } = useTemari();
  if (!ready) return <View style={styles.loading}><ActivityIndicator color={TEMARI_COLORS.emerald} /><Text style={styles.loadingText}>Opening your learning trail…</Text></View>;
  if (!user) return <Redirect href="/login" />;
  const bottomPadding = Platform.OS === "web" ? 9 : Math.max(insets.bottom, 8);
  return <Tabs screenOptions={{
    headerShown: false,
    tabBarActiveTintColor: TEMARI_COLORS.emerald,
    tabBarInactiveTintColor: "#849087",
    tabBarLabelStyle: { fontSize: 10, fontWeight: "800", marginTop: 1 },
    tabBarStyle: { height: 58 + bottomPadding, paddingTop: 5, paddingBottom: bottomPadding, backgroundColor: "#FFFDF8", borderTopColor: TEMARI_COLORS.border, borderTopWidth: StyleSheet.hairlineWidth },
    tabBarIcon: ({ color, size, focused }) => <Ionicons name="map-outline" size={size} color={focused ? TEMARI_COLORS.emerald : color} />,
  }}>
    <Tabs.Screen name="index" options={{ title: "Quests", tabBarIcon: ({ color, size }) => <Ionicons name={icons.index} size={size} color={color} /> }} />
    <Tabs.Screen name="read" options={{ title: "Read", tabBarIcon: ({ color, size }) => <Ionicons name={icons.read} size={size} color={color} /> }} />
    <Tabs.Screen name="ai" options={{ title: "Temari AI", tabBarIcon: ({ color, size }) => <Ionicons name={icons.ai} size={size} color={color} /> }} />
    <Tabs.Screen name="leaderboard" options={{ title: "Leaders", tabBarIcon: ({ color, size }) => <Ionicons name={icons.leaderboard} size={size} color={color} /> }} />
    <Tabs.Screen name="rewards" options={{ title: "Rewards", tabBarIcon: ({ color, size }) => <Ionicons name={icons.rewards} size={size} color={color} /> }} />
  </Tabs>;
}

const styles = StyleSheet.create({ loading: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, backgroundColor: TEMARI_COLORS.parchment }, loadingText: { color: TEMARI_COLORS.muted, fontWeight: "700" } });
