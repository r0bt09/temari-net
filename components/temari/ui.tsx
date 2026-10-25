import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { RefreshControlProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TEMARI_COLORS } from "@/constants/temari";
import { useTemari } from "@/lib/temari/TemariProvider";

export function BrandMark({ size = 42 }: { size?: number }) {
  const [imageFailed, setImageFailed] = useState(false);
  const useGeneratedWebImage = Platform.OS === "web" && !imageFailed;
  return <View style={[styles.brandMark, { width: size, height: size, borderRadius: size * 0.32, overflow: "hidden" }]}>
    {useGeneratedWebImage ? <Image source={{ uri: "/manus-storage/async-images/6zZKo1ergKIlEwNp5n5Jpm/image-1.webp" }} resizeMode="cover" onError={() => setImageFailed(true)} style={{ width: size, height: size }} /> : <>
      <Ionicons name="book" size={size * 0.48} color={TEMARI_COLORS.parchment} />
      <Text style={[styles.brandStar, { fontSize: size * 0.3 }]}>✦</Text>
    </>}
  </View>;
}

export function AppHeader({ title = "TEMARI NET", subtitle }: { title?: string; subtitle?: string }) {
  const { user, logout, connected } = useTemari();
  const [settingsOpen, setSettingsOpen] = useState(false);
  return <>
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <BrandMark size={44} />
        <View style={{ flexShrink: 1 }}>
          <Text style={styles.wordmark}>{title}</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{subtitle ?? (user ? `${user.fullName} · ${user.gradeLevel}` : "Learning quests from Ethiopia")}</Text>
        </View>
      </View>
      <View style={styles.headerRight}>
        {user ? <View style={styles.coinPill}><Text style={styles.coinText}>🪙 {user.coins}</Text></View> : null}
        {user ? <View style={styles.streakPill}><Text style={styles.streakText}>🔥 {user.streak}</Text></View> : null}
        <Pressable accessibilityLabel="Server settings" onPress={() => setSettingsOpen(true)} style={styles.iconButton}><Ionicons name="settings-outline" size={19} color={TEMARI_COLORS.ink} /></Pressable>
        {user ? <Pressable accessibilityLabel="Log out" onPress={() => void logout()} style={styles.iconButton}><Ionicons name="log-out-outline" size={20} color={TEMARI_COLORS.ink} /></Pressable> : null}
      </View>
    </View>
    <View style={[styles.connection, connected ? styles.connectionOn : styles.connectionOff]}>
      <View style={[styles.connectionDot, connected && styles.connectionDotOn]} />
      <Text style={styles.connectionText}>{connected ? "Synced with your learning world" : "Offline · showing saved learning content"}</Text>
    </View>
    <ServerSettings visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
  </>;
}

export function ServerSettings({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { apiBaseUrl, updateApiBaseUrl, apiRequest } = useTemari();
  const [value, setValue] = useState(apiBaseUrl);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    try {
      await updateApiBaseUrl(value);
      setBusy(true);
      await apiRequest("/health");
      setMessage("Connected. Your app is ready to sync.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not reach this server.");
    } finally { setBusy(false); }
  };
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.modalBackdrop}><View style={styles.modalCard}>
      <Text style={styles.modalTitle}>Choose your learning server</Text>
      <Text style={styles.modalCopy}>For an Android Emulator, use http://10.0.2.2:5000/api. On a phone, enter your computer’s Wi-Fi address, for example http://192.168.1.5:5000/api.</Text>
      <TextInput value={value} onChangeText={setValue} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="http://10.0.2.2:5000/api" style={styles.input} />
      {!!message && <Text style={styles.inlineMessage}>{message}</Text>}
      <View style={styles.modalActions}>
        <Pressable onPress={onClose} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Close</Text></Pressable>
        <Pressable onPress={() => void save()} style={styles.primaryButton}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Save & connect</Text>}</Pressable>
      </View>
    </View></View>
  </Modal>;
}

export function Page({ children, refreshControl }: { children: React.ReactNode; refreshControl?: React.ReactElement<RefreshControlProps> }) {
  return <SafeAreaView style={styles.safe} edges={["top"]}><ScrollView contentContainerStyle={styles.page} refreshControl={refreshControl} keyboardShouldPersistTaps="handled">{children}</ScrollView></SafeAreaView>;
}

export function SectionTitle({ eyebrow, title, body }: { eyebrow?: string; title: string; body?: string }) {
  return <View style={{ gap: 4, marginBottom: 14 }}>{eyebrow ? <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text> : null}<Text style={styles.sectionTitle}>{title}</Text>{body ? <Text style={styles.sectionBody}>{body}</Text> : null}</View>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function PillButton({ label, onPress, selected, style }: { label: string; onPress: () => void; selected?: boolean; style?: object }) {
  return <Pressable onPress={onPress} style={[styles.pillButton, selected && styles.pillSelected, style]}><Text style={[styles.pillLabel, selected && styles.pillLabelSelected]}>{label}</Text></Pressable>;
}

export function PrimaryButton({ label, onPress, disabled, loading }: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: Boolean(disabled) }} onPress={onPress} disabled={disabled || loading} style={[styles.primaryButton, (disabled || loading) && { opacity: 0.55 }]}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{label}</Text>}</Pressable>;
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return <View style={styles.empty}><Text style={{ fontSize: 30 }}>🌱</Text><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.sectionBody}>{body}</Text></View>;
}

export const sharedStyles = StyleSheet.create({ input: { minHeight: 50, backgroundColor: "#fff", borderColor: TEMARI_COLORS.border, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, color: TEMARI_COLORS.ink, fontSize: 16 }, fieldLabel: { color: TEMARI_COLORS.ink, fontSize: 14, fontWeight: "700", marginBottom: 6 }, });

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: TEMARI_COLORS.parchment },
  page: { paddingHorizontal: 18, paddingBottom: 28, gap: 16 },
  header: { minHeight: 60, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, paddingTop: 6 },
  headerLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 5 },
  brandMark: { backgroundColor: TEMARI_COLORS.emerald, justifyContent: "center", alignItems: "center", position: "relative" },
  brandStar: { position: "absolute", top: 2, right: 4, color: TEMARI_COLORS.saffron, fontWeight: "900" },
  wordmark: { color: TEMARI_COLORS.emeraldDeep, fontSize: 15, fontWeight: "900", letterSpacing: 0.5 },
  headerSubtitle: { color: TEMARI_COLORS.muted, fontSize: 12, marginTop: 2, maxWidth: 190 },
  headerRightText: { color: TEMARI_COLORS.ink, fontSize: 13, fontWeight: "800" },
  coinPill: { backgroundColor: "#FFF0C9", paddingHorizontal: 9, paddingVertical: 7, borderRadius: 16 },
  streakPill: { backgroundColor: "#FBE3D9", paddingHorizontal: 8, paddingVertical: 7, borderRadius: 16 },
  coinText: { fontSize: 12, fontWeight: "900", color: TEMARI_COLORS.ink },
  streakText: { fontSize: 12, fontWeight: "900", color: "#8C3D2D" },
  iconButton: { width: 34, height: 34, borderRadius: 12, backgroundColor: "#F1EBDC", justifyContent: "center", alignItems: "center" },
  connection: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  connectionOn: { backgroundColor: "#E2F1E6" }, connectionOff: { backgroundColor: "#F2E9D9" },
  connectionDot: { width: 7, height: 7, backgroundColor: "#B67718", borderRadius: 99 }, connectionDotOn: { backgroundColor: "#308154" },
  connectionText: { color: TEMARI_COLORS.muted, fontSize: 11, fontWeight: "700" },
  card: { backgroundColor: TEMARI_COLORS.white, borderWidth: 1, borderColor: TEMARI_COLORS.border, borderRadius: 20, padding: 16, gap: 10, shadowColor: "#382E20", shadowOpacity: 0.04, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  eyebrow: { color: TEMARI_COLORS.emerald, fontSize: 11, fontWeight: "900", letterSpacing: 1.2 },
  sectionTitle: { color: TEMARI_COLORS.ink, fontSize: 23, lineHeight: 29, fontWeight: "900" },
  sectionBody: { color: TEMARI_COLORS.muted, fontSize: 14, lineHeight: 21 },
  pillButton: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 16, backgroundColor: "#F0EBDC", borderWidth: 1, borderColor: "transparent" },
  pillSelected: { backgroundColor: TEMARI_COLORS.emerald, borderColor: TEMARI_COLORS.emerald },
  pillLabel: { color: TEMARI_COLORS.ink, fontWeight: "700", fontSize: 13 }, pillLabelSelected: { color: "#fff" },
  primaryButton: { minHeight: 48, alignItems: "center", justifyContent: "center", paddingHorizontal: 17, borderRadius: 15, backgroundColor: TEMARI_COLORS.emerald },
  primaryButtonText: { color: "#fff", fontSize: 15, fontWeight: "900" },
  secondaryButton: { minHeight: 46, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, borderRadius: 15, backgroundColor: "#F1EBDC" },
  secondaryButtonText: { color: TEMARI_COLORS.ink, fontWeight: "800" },
  modalBackdrop: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "rgba(18,35,28,0.46)" },
  modalCard: { backgroundColor: TEMARI_COLORS.parchment, borderRadius: 24, padding: 20, gap: 13 },
  modalTitle: { color: TEMARI_COLORS.ink, fontWeight: "900", fontSize: 21 },
  modalCopy: { color: TEMARI_COLORS.muted, fontSize: 14, lineHeight: 20 },
  input: { minHeight: 48, backgroundColor: "#fff", borderColor: TEMARI_COLORS.border, borderWidth: 1, borderRadius: 14, paddingHorizontal: 13, color: TEMARI_COLORS.ink, fontSize: 16 },
  inlineMessage: { fontSize: 13, color: TEMARI_COLORS.emeraldDeep, fontWeight: "700" },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 9, marginTop: 4 },
  empty: { alignItems: "center", paddingVertical: 26, gap: 9 }, emptyTitle: { color: TEMARI_COLORS.ink, fontSize: 18, fontWeight: "900" },
});
