import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader, Card, SectionTitle } from "@/components/temari/ui";
import { TEMARI_COLORS } from "@/constants/temari";
import { useTemari } from "@/lib/temari/TemariProvider";

type Message = { id: string; from: "learner" | "tutor"; text: string };

export default function TemariAIScreen() {
  const { user, apiRequest } = useTemari();
  const [messages, setMessages] = useState<Message[]>([{ id: "welcome", from: "tutor", text: `Selam${user ? `, ${user.fullName.split(" ")[0]}` : ""}! I’m Temari AI. Ask me about a lesson, words, numbers, or Ethiopian wildlife.` }]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<FlatList<Message>>(null);

  useEffect(() => { listRef.current?.scrollToEnd({ animated: true }); }, [messages]);
  const send = async () => {
    const text = question.trim();
    if (!text || busy) return;
    if (text.length > 500) { setError("Let’s keep each question under 500 characters."); return; }
    setError(""); setQuestion("");
    const learner: Message = { id: `${Date.now()}-learner`, from: "learner", text };
    setMessages((items) => [...items, learner]); setBusy(true);
    try {
      const response = await apiRequest<{ answer: string }>("/ai/ask", { method: "POST", body: { question: text, studentName: user?.fullName ?? "Learner", gradeLevel: user?.gradeLevel ?? "Grade 1" } });
      setMessages((items) => [...items, { id: `${Date.now()}-tutor`, from: "tutor", text: response.answer }]);
    } catch (err) { setError(err instanceof Error ? err.message : "Temari AI could not reply just now. Try again soon."); }
    finally { setBusy(false); }
  };

  return <SafeAreaView style={styles.safe} edges={["top"]}><KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={80}>
    <View style={styles.headerWrap}><AppHeader subtitle="Ask a safe, friendly learning tutor" /></View>
    <View style={styles.intro}><SectionTitle eyebrow="YOUR FRIENDLY TUTOR" title="Ask Temari AI" body="Questions about your quests are welcome. Personal details are not needed." /></View>
    <Card style={styles.safety}><Ionicons name="shield-checkmark" size={19} color={TEMARI_COLORS.emerald} /><Text style={styles.safetyText}>Kind, simple answers for young learners. If the service is offline, try again when the server is back.</Text></Card>
    <FlatList ref={listRef} data={messages} keyExtractor={(item) => item.id} contentContainerStyle={styles.chatList} renderItem={({ item }) => <View style={[styles.messageRow, item.from === "learner" && { justifyContent: "flex-end" }]}><View style={[styles.bubble, item.from === "tutor" ? styles.tutorBubble : styles.learnerBubble]}><Text style={[styles.bubbleText, item.from === "learner" && { color: "#fff" }]}>{item.text}</Text>{item.from === "tutor" && <Pressable accessibilityLabel="Read answer aloud" style={styles.readAloud} onPress={() => Speech.speak(item.text, { rate: 0.9 })}><Ionicons name="volume-high-outline" size={16} color={TEMARI_COLORS.emerald} /><Text style={styles.readText}>Read aloud</Text></Pressable>}</View></View>} />
    {busy && <View style={styles.loadingRow}><ActivityIndicator color={TEMARI_COLORS.emerald} /><Text style={styles.loadingText}>Temari is thinking…</Text></View>}
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
    <View style={styles.composer}><TextInput value={question} onChangeText={setQuestion} placeholder="Ask about a quest…" placeholderTextColor="#87928A" multiline maxLength={500} style={styles.input} onSubmitEditing={() => void send()} returnKeyType="send" /><Pressable accessibilityLabel="Send question" disabled={!question.trim() || busy} onPress={() => void send()} style={[styles.sendButton, (!question.trim() || busy) && { opacity: 0.5 }]}><Ionicons name="arrow-up" size={21} color="#fff" /></Pressable></View>
    <Text style={styles.privacy}>A grown-up can help with anything confusing. Please don’t share private details.</Text>
  </KeyboardAvoidingView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: TEMARI_COLORS.parchment }, fill: { flex: 1, width: "100%", maxWidth: 760, alignSelf: "center" }, headerWrap: { paddingHorizontal: 18 }, intro: { paddingHorizontal: 18, paddingTop: 10 }, safety: { marginHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 8, padding: 11, backgroundColor: "#EAF2E9" }, safetyText: { flex: 1, color: TEMARI_COLORS.emeraldDeep, fontSize: 11, lineHeight: 16, fontWeight: "700" }, chatList: { gap: 12, paddingHorizontal: 18, paddingVertical: 14 }, messageRow: { flexDirection: "row" }, bubble: { maxWidth: "86%", borderRadius: 18, padding: 13, gap: 9 }, tutorBubble: { backgroundColor: "#fff", borderWidth: 1, borderColor: TEMARI_COLORS.border, borderTopLeftRadius: 7 }, learnerBubble: { backgroundColor: TEMARI_COLORS.emerald, borderTopRightRadius: 7 }, bubbleText: { fontSize: 15, lineHeight: 21, color: TEMARI_COLORS.ink }, readAloud: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", backgroundColor: "#EAF2E9", paddingHorizontal: 9, paddingVertical: 6, borderRadius: 11 }, readText: { color: TEMARI_COLORS.emerald, fontSize: 11, fontWeight: "900" }, loadingRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 5 }, loadingText: { color: TEMARI_COLORS.muted, fontSize: 12, fontWeight: "700" }, errorText: { color: "#A04335", fontSize: 12, fontWeight: "700", paddingHorizontal: 18, paddingBottom: 6 }, composer: { flexDirection: "row", alignItems: "flex-end", gap: 9, paddingHorizontal: 16, paddingVertical: 9, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: TEMARI_COLORS.border }, input: { flex: 1, minHeight: 46, maxHeight: 110, borderRadius: 16, paddingHorizontal: 13, paddingVertical: 11, fontSize: 15, color: TEMARI_COLORS.ink, backgroundColor: TEMARI_COLORS.parchment }, sendButton: { width: 43, height: 43, alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: TEMARI_COLORS.emerald }, privacy: { color: TEMARI_COLORS.muted, backgroundColor: "#fff", fontSize: 10, textAlign: "center", paddingBottom: 7, paddingHorizontal: 10 },
});
