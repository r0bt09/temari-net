import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, AppHeader, EmptyState, Page, PillButton, PrimaryButton, SectionTitle } from "@/components/temari/ui";
import { SUBJECTS, TEMARI_COLORS, SAMPLE_LESSONS, type Lesson } from "@/constants/temari";
import { useTemari } from "@/lib/temari/TemariProvider";

const subjectAccent: Record<string, string> = { Amharic: "#EAF3E7", Math: "#FFF0D1", English: "#E6EFF8", Science: "#FBE9E1" };
type SubmitResult = { correct: boolean; earnedCoins: number; correctAnswer: string; user?: Parameters<ReturnType<typeof useTemari>["setUser"]>[0] };

export default function QuestsScreen() {
  const router = useRouter();
  const { user, apiRequest, setUser, refreshProfile } = useTemari();
  const [lessons, setLessons] = useState<Lesson[]>(SAMPLE_LESSONS);
  const [subject, setSubject] = useState<string>("All");
  const [selected, setSelected] = useState<Lesson | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [completed, setCompleted] = useState<number[]>([]);
  const gradeLevel = user?.gradeLevel;

  const loadLessons = useCallback(async () => {
    try {
      const gradeQuery = gradeLevel ? `?grade_level=${encodeURIComponent(gradeLevel)}` : "";
      const rows = await apiRequest<Lesson[]>(`/lessons${gradeQuery}`);
      if (Array.isArray(rows) && rows.length) setLessons(rows);
      else setLessons([]);
    } catch {
      setLessons((current) => current.length ? current : SAMPLE_LESSONS);
    }
  }, [apiRequest, gradeLevel]);
  useFocusEffect(useCallback(() => { void loadLessons(); }, [loadLessons]));

  const visible = useMemo(() => subject === "All" ? lessons : lessons.filter((item) => item.subject === subject), [lessons, subject]);
  const openQuiz = (lesson: Lesson) => { setSelected(lesson); setAnswer(null); setResult(null); setMessage(""); };
  const submitAnswer = async (option: string) => {
    if (!selected || !user || busy || result) return;
    setAnswer(option);
    setBusy(true);
    try {
      const outcome = await apiRequest<SubmitResult>("/lessons/submit", { method: "POST", body: { student_id: user.id, lesson_id: selected.id, selected_option: option } });
      setResult(outcome);
      if (outcome.user) setUser(outcome.user);
      else if (outcome.correct) await refreshProfile();
      if (outcome.correct) { setCompleted((items) => items.includes(selected.id) ? items : [...items, selected.id]); Speech.speak("Gobez! You got it right!", { rate: 0.95 }); }
      else Speech.speak(`Good try. The answer is ${outcome.correctAnswer}.`, { rate: 0.9 });
    } catch (error) { setMessage(error instanceof Error ? error.message : "Your answer could not sync. Please try again."); }
    finally { setBusy(false); }
  };

  return <Page refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadLessons().finally(() => setRefreshing(false)); }} tintColor={TEMARI_COLORS.emerald} />}>
    <AppHeader subtitle={user ? `${user.fullName} · ${user.gradeLevel}` : "Learning quests from Ethiopia"} />
    <View style={styles.hero}>
      <View style={{ flex: 1, gap: 6 }}><Text style={styles.heroEyebrow}>YOUR LEARNING TRAIL</Text><Text style={styles.heroTitle}>Selam{user ? `, ${user.fullName.split(" ")[0]}` : ""}!</Text><Text style={styles.heroBody}>Pick a quest. Every new idea earns a little sparkle.</Text></View>
      <View style={styles.pathBadge}><Ionicons name="trail-sign-outline" color={TEMARI_COLORS.emerald} size={29} /><Text style={styles.pathCount}>{completed.length} done</Text></View>
    </View>
    <View style={styles.sponsorBand}><View style={styles.sponsorIcon}><Ionicons name="heart" size={19} color="#C75B51" /></View><View style={{ flex: 1 }}><Text style={styles.sponsorTitle}>Help a learner shine</Text><Text style={styles.sponsorText}>Sponsor 50 ETB with Telebirr or CBE Birr.</Text></View><Pressable onPress={() => router.push("/(tabs)/rewards")} style={styles.sponsorButton}><Text style={styles.sponsorButtonText}>Explore</Text></Pressable></View>
    <View><SectionTitle eyebrow="Choose your path" title="Which world today?" body="Tap a subject to find your next bright idea." /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>{SUBJECTS.map((value) => <PillButton key={value} label={value === "All" ? "All quests" : value} selected={subject === value} onPress={() => setSubject(value)} />)}</ScrollView></View>
    <View style={{ gap: 11 }}>
      {visible.map((lesson, index) => <Pressable accessibilityRole="button" accessibilityLabel={`Start ${lesson.title}`} key={lesson.id} onPress={() => openQuiz(lesson)}><Card style={styles.questCard}>
        <View style={[styles.subjectIcon, { backgroundColor: subjectAccent[lesson.subject] ?? "#EAF3E7" }]}><Text style={styles.subjectGlyph}>{lesson.subject === "Amharic" ? "ሀ" : lesson.subject === "Math" ? "＋" : lesson.subject === "English" ? "A" : "✿"}</Text></View>
        <View style={{ flex: 1, gap: 3 }}><View style={styles.metaRow}><Text style={styles.subjectLabel}>{lesson.subject}</Text><Text style={styles.dot}>·</Text><Text style={styles.gradeLabel}>{lesson.gradeLevel}</Text></View><Text style={styles.lessonTitle}>{lesson.title}</Text><Text style={styles.lessonQuestion} numberOfLines={2}>{lesson.question}</Text></View>
        <View style={styles.reward}><Text style={styles.rewardCoin}>🪙</Text><Text style={styles.rewardValue}>+{lesson.rewardCoins}</Text></View>
        <View style={styles.rowMarker}><Text style={styles.rowNumber}>{String(index + 1).padStart(2, "0")}</Text><Ionicons name={completed.includes(lesson.id) ? "checkmark-circle" : "arrow-forward-circle"} size={24} color={completed.includes(lesson.id) ? "#308154" : TEMARI_COLORS.emerald} /></View>
      </Card></Pressable>)}
      {visible.length === 0 && <EmptyState title="A new quest is coming" body="There are no lessons in this subject just yet. Try another learning path." />}
    </View>
    <Modal visible={Boolean(selected)} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
      <View style={styles.modalBackdrop}><View style={styles.quizCard}>
        <View style={styles.quizTop}><View style={styles.quizTag}><Text style={styles.quizTagText}>{selected?.subject} · +{selected?.rewardCoins} coins</Text></View><Pressable accessibilityLabel="Close quiz" onPress={() => setSelected(null)} style={styles.closeButton}><Ionicons name="close" size={23} color={TEMARI_COLORS.ink} /></Pressable></View>
        <Text style={styles.quizTitle}>{selected?.title}</Text><Text style={styles.question}>{selected?.question}</Text>
        <Pressable onPress={() => selected && Speech.speak(selected.question, { rate: 0.88, language: selected.subject === "Amharic" ? "am-ET" : "en-US" })} style={styles.listen}><Ionicons name="volume-high-outline" size={19} color={TEMARI_COLORS.emerald} /><Text style={styles.listenText}>Read the question aloud</Text></Pressable>
        <View style={{ gap: 9 }}>{selected?.options.map((option, idx) => { const isCorrect = Boolean(result && option === result.correctAnswer); const isWrongChoice = Boolean(result && answer === option && !result.correct); return <Pressable key={`${selected.id}-${idx}`} disabled={busy || Boolean(result)} onPress={() => void submitAnswer(option)} style={[styles.optionButton, isCorrect && styles.optionCorrect, isWrongChoice && styles.optionWrong]}><Text style={[styles.optionLetter, isCorrect && { backgroundColor: "#D3EBDD" }]}>{String.fromCharCode(65 + idx)}</Text><Text style={styles.optionText}>{option}</Text><Ionicons name={isCorrect ? "checkmark-circle" : "chevron-forward"} size={19} color={isCorrect ? "#257A4B" : "#8A958E"} /></Pressable>; })}</View>
        {busy && <Text style={styles.feedback}>Checking your answer…</Text>}
        {result && <View style={[styles.resultBox, result.correct ? styles.resultGood : styles.resultTry]}><Text style={styles.feedback}>{result.correct ? (result.earnedCoins > 0 ? `Gobez! +${result.earnedCoins} coins are yours!` : "You already solved this one—great memory!") : `Good try. The answer is ${result.correctAnswer}.`}</Text></View>}
        {message ? <Text style={[styles.feedback, { color: "#A04335" }]}>{message}</Text> : null}
        {result && <PrimaryButton label="Back to my quests" onPress={() => setSelected(null)} />}
      </View></View>
    </Modal>
  </Page>;
}

const styles = StyleSheet.create({
  hero: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 23, padding: 19, backgroundColor: TEMARI_COLORS.emeraldDeep }, heroEyebrow: { color: TEMARI_COLORS.saffron, fontSize: 10, letterSpacing: 1.4, fontWeight: "900" }, heroTitle: { color: "#fff", fontWeight: "900", fontSize: 27 }, heroBody: { color: "#E0EEE6", fontSize: 14, lineHeight: 20, maxWidth: 310 }, pathBadge: { width: 75, height: 75, backgroundColor: "#EAF1D7", borderRadius: 24, alignItems: "center", justifyContent: "center", gap: 3 }, pathCount: { color: TEMARI_COLORS.emeraldDeep, fontWeight: "900", fontSize: 11 }, sponsorBand: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FCEBE1", padding: 12, borderRadius: 17, borderWidth: 1, borderColor: "#F5D3C4" }, sponsorIcon: { width: 37, height: 37, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF7F2" }, sponsorTitle: { color: TEMARI_COLORS.ink, fontSize: 13, fontWeight: "900" }, sponsorText: { color: TEMARI_COLORS.muted, fontSize: 11, marginTop: 2 }, sponsorButton: { backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 11, paddingVertical: 9 }, sponsorButtonText: { color: "#A8493E", fontSize: 12, fontWeight: "900" },
  questCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 13 }, subjectIcon: { width: 46, height: 46, borderRadius: 16, justifyContent: "center", alignItems: "center" }, subjectGlyph: { color: TEMARI_COLORS.emeraldDeep, fontSize: 25, fontWeight: "900" }, metaRow: { flexDirection: "row", alignItems: "center", gap: 5 }, subjectLabel: { fontSize: 10, fontWeight: "900", color: TEMARI_COLORS.emerald }, dot: { color: TEMARI_COLORS.muted }, gradeLabel: { color: TEMARI_COLORS.muted, fontSize: 10, fontWeight: "700" }, lessonTitle: { color: TEMARI_COLORS.ink, fontSize: 15, fontWeight: "900" }, lessonQuestion: { color: TEMARI_COLORS.muted, fontSize: 12, lineHeight: 17 }, reward: { alignItems: "center", gap: 2, minWidth: 36 }, rewardCoin: { fontSize: 16 }, rewardValue: { color: TEMARI_COLORS.ink, fontSize: 11, fontWeight: "900" }, rowMarker: { position: "absolute", right: 9, bottom: 7, flexDirection: "row", alignItems: "center", gap: 5 }, rowNumber: { color: "#9DA89E", fontSize: 9, fontWeight: "900" },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(20,43,33,0.52)" }, quizCard: { width: "100%", maxWidth: 580, maxHeight: "92%", alignSelf: "center", padding: 20, paddingBottom: 28, gap: 13, backgroundColor: TEMARI_COLORS.parchment, borderTopLeftRadius: 28, borderTopRightRadius: 28 }, quizTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, quizTag: { backgroundColor: "#E6F0E5", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 7 }, quizTagText: { color: TEMARI_COLORS.emerald, fontSize: 12, fontWeight: "900" }, closeButton: { width: 36, height: 36, backgroundColor: "#F1EBDC", borderRadius: 13, alignItems: "center", justifyContent: "center" }, quizTitle: { color: TEMARI_COLORS.emerald, fontSize: 13, fontWeight: "900" }, question: { color: TEMARI_COLORS.ink, fontSize: 23, lineHeight: 30, fontWeight: "900" }, listen: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 6, backgroundColor: "#E9F2E8", paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14 }, listenText: { color: TEMARI_COLORS.emerald, fontSize: 12, fontWeight: "900" }, optionButton: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: "#fff", borderRadius: 16, paddingHorizontal: 12, borderWidth: 1.5, borderColor: TEMARI_COLORS.border }, optionCorrect: { borderColor: "#5B9B6A", backgroundColor: "#F0F8F0" }, optionWrong: { borderColor: "#D98C78", backgroundColor: "#FFF4F0" }, optionLetter: { width: 30, height: 30, textAlign: "center", textAlignVertical: "center", overflow: "hidden", borderRadius: 10, backgroundColor: "#F2EFE6", color: TEMARI_COLORS.ink, fontWeight: "900" }, optionText: { flex: 1, fontSize: 15, color: TEMARI_COLORS.ink, fontWeight: "800" }, feedback: { fontSize: 14, color: TEMARI_COLORS.emeraldDeep, fontWeight: "800", lineHeight: 20 }, resultBox: { padding: 12, borderRadius: 14 }, resultGood: { backgroundColor: "#E1F1E4" }, resultTry: { backgroundColor: "#FFF0D8" },
});
