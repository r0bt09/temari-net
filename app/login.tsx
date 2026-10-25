import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GRADE_LEVELS, TEMARI_COLORS, type TemariGrade } from "@/constants/temari";
import { BrandMark, PrimaryButton, ServerSettings, sharedStyles } from "@/components/temari/ui";
import { useTemari } from "@/lib/temari/TemariProvider";

export default function LoginScreen() {
  const router = useRouter();
  const { ready, user, login, register, connected } = useTemari();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [grade, setGrade] = useState<TemariGrade>("Grade 1");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => { if (ready && user) router.replace("/(tabs)"); }, [ready, user, router]);

  const submit = async () => {
    setMessage("");
    if (mode === "register" && name.trim().length < 2) { setMessage("Add your learner’s name first."); return; }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setMessage("Check the email address and try again."); return; }
    if (password.length < 8) { setMessage("Choose a password with at least 8 characters."); return; }
    setBusy(true);
    try {
      if (mode === "login") await login(email.trim(), password);
      else await register(name.trim(), email.trim(), password, grade);
      router.replace("/(tabs)");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not connect. Check the server setting and try again."); }
    finally { setBusy(false); }
  };

  return <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <View style={styles.brand}><BrandMark size={52} /><View><Text style={styles.wordmark}>TEMARI NET</Text><Text style={styles.tagline}>Small steps. Bright discoveries.</Text></View></View>
          <Pressable accessibilityLabel="Server IP settings" onPress={() => setSettingsOpen(true)} style={styles.settingsButton}><Ionicons name="settings-outline" size={21} color={TEMARI_COLORS.ink} /></Pressable>
        </View>
        <View style={styles.hero}>
          <Text style={styles.heroKicker}>SELAM, LITTLE EXPLORER</Text>
          <Text style={styles.heroTitle}>{mode === "login" ? "Your next quest is waiting." : "Let’s make a learning account."}</Text>
          <Text style={styles.heroBody}>Learn Amharic, explore numbers, and collect coins one bright idea at a time.</Text>
          <View style={styles.fidelRow}><Text style={styles.fidel}>ሀ</Text><Text style={styles.fidel}>ለ</Text><Text style={styles.fidel}>ሐ</Text><Text style={styles.fidel}>መ</Text><Text style={styles.fidelNote}>Your Fidel trail starts here</Text></View>
        </View>
        <View style={styles.form}>
          <View style={styles.toggleRow}>
            <Pressable onPress={() => { setMode("login"); setMessage(""); }} style={[styles.toggle, mode === "login" && styles.toggleActive]}><Text style={[styles.toggleText, mode === "login" && styles.toggleTextActive]}>Student login</Text></Pressable>
            <Pressable onPress={() => { setMode("register"); setMessage(""); }} style={[styles.toggle, mode === "register" && styles.toggleActive]}><Text style={[styles.toggleText, mode === "register" && styles.toggleTextActive]}>Create account</Text></Pressable>
          </View>
          {mode === "register" && <><Text style={styles.label}>Learner name</Text><TextInput value={name} onChangeText={setName} placeholder="Abebe Tadesse" style={sharedStyles.input} autoCapitalize="words" returnKeyType="next" /><Text style={styles.label}>Choose a grade</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingVertical: 2 }}>{GRADE_LEVELS.map((item) => <Pressable key={item} onPress={() => setGrade(item)} style={[styles.gradeChip, grade === item && styles.gradeChipSelected]}><Text style={[styles.gradeText, grade === item && { color: "#fff" }]}>{item}</Text></Pressable>)}</ScrollView></>}
          <Text style={styles.label}>Email</Text><TextInput value={email} onChangeText={setEmail} placeholder="student@example.com" style={sharedStyles.input} autoCapitalize="none" keyboardType="email-address" autoCorrect={false} returnKeyType="next" />
          <Text style={styles.label}>Password</Text><TextInput value={password} onChangeText={setPassword} placeholder="At least 8 characters" style={sharedStyles.input} secureTextEntry returnKeyType="go" onSubmitEditing={() => void submit()} />
          {message ? <View style={styles.messageBox}><Text style={styles.messageText}>{message}</Text></View> : null}
          <PrimaryButton label={mode === "login" ? "Enter my learning world" : "Create student account"} onPress={() => void submit()} disabled={!ready} loading={busy} />
          <Text style={styles.serverHint}>{connected ? "Connected to your TEMARI learning server." : "If your server is offline, open ⚙ to set your computer or phone address."}</Text>
        </View>
        <Text style={styles.footer}>Made for curious learners in Ethiopia · እንማር!</Text>
      </ScrollView>
    </KeyboardAvoidingView>
    <ServerSettings visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: TEMARI_COLORS.parchment }, page: { flexGrow: 1, width: "100%", maxWidth: 620, alignSelf: "center", padding: 20, gap: 17 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, brand: { flexDirection: "row", alignItems: "center", gap: 11 }, wordmark: { fontSize: 18, fontWeight: "900", letterSpacing: 1, color: TEMARI_COLORS.emeraldDeep }, tagline: { fontSize: 12, fontWeight: "700", color: TEMARI_COLORS.muted, marginTop: 2 },
  settingsButton: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#F0EBDC" }, hero: { padding: 21, borderRadius: 25, backgroundColor: TEMARI_COLORS.emeraldDeep, gap: 9, overflow: "hidden" }, heroKicker: { color: TEMARI_COLORS.saffron, fontWeight: "900", fontSize: 11, letterSpacing: 1.5 }, heroTitle: { fontSize: 28, lineHeight: 34, color: "#fff", fontWeight: "900", maxWidth: 390 }, heroBody: { color: "#E3F2E9", fontSize: 15, lineHeight: 22, maxWidth: 420 }, fidelRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 6 }, fidel: { width: 37, height: 37, textAlign: "center", textAlignVertical: "center", borderRadius: 12, overflow: "hidden", color: TEMARI_COLORS.ink, backgroundColor: "#FFE8B2", fontSize: 23, fontWeight: "900" }, fidelNote: { color: "#F2E6CA", fontSize: 12, fontWeight: "700", marginLeft: 4 },
  form: { backgroundColor: "#fff", borderWidth: 1, borderColor: TEMARI_COLORS.border, borderRadius: 23, padding: 17, gap: 10 }, toggleRow: { flexDirection: "row", padding: 4, backgroundColor: "#F3EEE3", borderRadius: 15, marginBottom: 4 }, toggle: { flex: 1, minHeight: 41, justifyContent: "center", alignItems: "center", borderRadius: 11 }, toggleActive: { backgroundColor: "#fff", shadowOpacity: 0.08, shadowRadius: 5, elevation: 1 }, toggleText: { fontSize: 13, fontWeight: "800", color: TEMARI_COLORS.muted }, toggleTextActive: { color: TEMARI_COLORS.emerald }, label: { color: TEMARI_COLORS.ink, fontSize: 13, fontWeight: "800", marginTop: 2 }, gradeChip: { paddingHorizontal: 11, paddingVertical: 9, borderRadius: 14, backgroundColor: "#F1EBDC" }, gradeChipSelected: { backgroundColor: TEMARI_COLORS.emerald }, gradeText: { color: TEMARI_COLORS.ink, fontWeight: "800", fontSize: 12 }, messageBox: { backgroundColor: "#FFF0EA", borderRadius: 12, padding: 11 }, messageText: { color: "#8D4334", fontSize: 13, fontWeight: "700" }, serverHint: { color: TEMARI_COLORS.muted, fontSize: 12, lineHeight: 17, textAlign: "center" }, footer: { textAlign: "center", color: TEMARI_COLORS.muted, fontSize: 12, fontWeight: "700", paddingVertical: 4 },
});
