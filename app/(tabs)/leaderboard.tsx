import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, RefreshControl, StyleSheet, Text, View } from "react-native";
import { AppHeader, Card, EmptyState, Page, PillButton, SectionTitle } from "@/components/temari/ui";
import { TEMARI_COLORS } from "@/constants/temari";
import { useTemari } from "@/lib/temari/TemariProvider";

type Leader = { id: number; fullName?: string; full_name?: string; name?: string; role: string; gradeLevel?: string; grade_level?: string; coins: number };

export default function LeaderboardScreen() {
  const { apiRequest, user } = useTemari();
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const rows = await apiRequest<Leader[]>(`/leaderboard?role=${role}`); setLeaders(Array.isArray(rows) ? rows.slice(0, 20) : []); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not load the live leaderboard."); }
    finally { setLoading(false); }
  }, [apiRequest, role]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const medals = ["🥇", "🥈", "🥉"];
  return <Page refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={TEMARI_COLORS.emerald} />}>
    <AppHeader subtitle="Celebrate every learning journey" />
    <View style={styles.hero}><Text style={styles.heroIcon}>🏆</Text><Text style={styles.kicker}>A LITTLE FRIENDLY CHEER</Text><Text style={styles.heroTitle}>Look how far we’ve come!</Text><Text style={styles.heroBody}>Coins celebrate practice, curiosity, and kind encouragement.</Text></View>
    <View><SectionTitle eyebrow="Top learners" title="Leaderboard" body="Fresh from your shared learning server." /><View style={styles.switch}><PillButton label="Top Students" selected={role === "student"} onPress={() => setRole("student")} style={{ flex: 1, alignItems: "center" }} /><PillButton label="Top Teachers" selected={role === "teacher"} onPress={() => setRole("teacher")} style={{ flex: 1, alignItems: "center" }} /></View></View>
    {loading && leaders.length === 0 ? <ActivityIndicator color={TEMARI_COLORS.emerald} style={{ marginVertical: 22 }} /> : null}
    {error ? <Card style={styles.errorCard}><Text style={styles.errorText}>{error}</Text></Card> : null}
    {leaders.map((leader, index) => { const name = leader.fullName ?? leader.full_name ?? leader.name ?? "Learner"; const isCurrent = leader.id === user?.id; return <Card key={leader.id} style={[styles.row, isCurrent && styles.currentRow]}><View style={styles.rank}><Text style={styles.rankText}>{medals[index] ?? index + 1}</Text></View><View style={styles.person}><Text style={styles.personName}>{name}{isCurrent ? " · You" : ""}</Text><Text style={styles.grade}>{leader.gradeLevel ?? leader.grade_level ?? (role === "teacher" ? "Learning guide" : "Curious learner")}</Text></View><View style={styles.coins}><Ionicons name="sparkles" size={15} color="#B17714" /><Text style={styles.coinValue}>{leader.coins}</Text></View></Card>; })}
    {!loading && !error && leaders.length === 0 ? <EmptyState title="The first steps are yours" body="Finish a quest to add a learner to the leaderboard." /> : null}
  </Page>;
}

const styles = StyleSheet.create({ hero: { alignItems: "center", paddingVertical: 20, paddingHorizontal: 18, gap: 6, backgroundColor: "#E8F1E5", borderRadius: 23 }, heroIcon: { fontSize: 35 }, kicker: { color: TEMARI_COLORS.emerald, fontWeight: "900", letterSpacing: 1.2, fontSize: 10 }, heroTitle: { color: TEMARI_COLORS.ink, fontSize: 23, lineHeight: 29, fontWeight: "900", textAlign: "center" }, heroBody: { color: TEMARI_COLORS.muted, fontSize: 13, textAlign: "center", lineHeight: 18 }, switch: { flexDirection: "row", gap: 8, marginTop: 12 }, row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }, currentRow: { borderColor: TEMARI_COLORS.emerald, borderWidth: 1.5 }, rank: { width: 39, height: 39, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#F3EEDC" }, rankText: { fontSize: 17, fontWeight: "900", color: TEMARI_COLORS.ink }, person: { flex: 1, gap: 2 }, personName: { color: TEMARI_COLORS.ink, fontSize: 14, fontWeight: "900" }, grade: { color: TEMARI_COLORS.muted, fontSize: 11 }, coins: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FFF0C9", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 13 }, coinValue: { color: TEMARI_COLORS.ink, fontWeight: "900", fontSize: 13 }, errorCard: { backgroundColor: "#FFF0EA" }, errorText: { color: "#A04335", fontWeight: "700", fontSize: 13 },
});
