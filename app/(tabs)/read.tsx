import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppHeader, Card, EmptyState, Page, SectionTitle } from "@/components/temari/ui";
import { TEMARI_COLORS, SAMPLE_LESSONS } from "@/constants/temari";
import { useTemari } from "@/lib/temari/TemariProvider";

const words = [
  { id: "fidel-ha", word: "ሀ", label: "Ha · ሀ", note: "A first step on the Fidel trail", language: "am-ET" },
  { id: "fidel-le", word: "ለ", label: "Le · ለ", note: "Say it slowly: lä", language: "am-ET" },
  { id: "fidel-hha", word: "ሐ", label: "Hha · ሐ", note: "Listen, then try the sound", language: "am-ET" },
  { id: "fidel-me", word: "መ", label: "Me · መ", note: "A new Fidel to discover", language: "am-ET" },
  { id: "english-library", word: "library", label: "Library", note: "A place where we read books", language: "en-US" },
  { id: "english-birr", word: "birr", label: "Birr", note: "The money we count in our math quests", language: "en-US" },
  { id: "english-walia", word: "Walia ibex", label: "Walia ibex", note: "A mountain animal native to Ethiopia", language: "en-US" },
];
const STAR_KEY = "temari-net-practice-stars-v1";

export default function ReadStudioScreen() {
  const { apiRequest } = useTemari();
  const [stars, setStars] = useState(0);
  const [readyId, setReadyId] = useState<string | null>(null);
  const [wordsFromApi, setWordsFromApi] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  useEffect(() => { void AsyncStorage.getItem(STAR_KEY).then((value) => setStars(Number(value ?? 0))); }, []);
  useEffect(() => {
    let active = true;
    void apiRequest<typeof SAMPLE_LESSONS>("/lessons").then((lessons) => {
      if (active && Array.isArray(lessons)) setWordsFromApi(lessons.map((lesson) => lesson.pronunciationWord).filter((word): word is string => Boolean(word)));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [apiRequest]);

  const listen = useCallback((word: typeof words[number]) => {
    setReadyId(null);
    Speech.speak(word.word, { rate: 0.85, language: word.language, onDone: () => setReadyId(word.id), onStopped: () => setReadyId(word.id) });
  }, []);
  const practice = useCallback((word: typeof words[number]) => {
    setMessage(""); setReadyId(null);
    Speech.speak(`Your turn! Say ${word.word}.`, { rate: 0.9, language: word.language, onDone: () => setReadyId(word.id) });
  }, []);
  const awardStar = async () => {
    const next = stars + 1;
    setStars(next);
    await AsyncStorage.setItem(STAR_KEY, String(next));
    setMessage("Gobez! One practice star for speaking aloud.");
    setReadyId(null);
  };

  const uniqueWords = [...new Set(wordsFromApi)];
  return <Page>
    <AppHeader subtitle="Speak & Read Studio" />
    <View style={styles.hero}><View style={{ flex: 1, gap: 5 }}><Text style={styles.kicker}>LISTEN · SAY · SHINE</Text><Text style={styles.heroTitle}>Your voice is a superpower.</Text><Text style={styles.heroBody}>Tap Listen, then try the word aloud. Practice stars celebrate effort.</Text></View><View style={styles.starBadge}><Text style={{ fontSize: 23 }}>⭐</Text><Text style={styles.starCount}>{stars}</Text></View></View>
    <SectionTitle eyebrow="Fidel and words" title="Let’s read together" body={uniqueWords.length ? `Your lessons have ${uniqueWords.length} pronunciation words too.` : "Start with a few friendly sounds and words."} />
    {words.map((item, index) => <Card key={item.id} style={styles.wordCard}>
      <View style={[styles.glyphBox, index < 4 && styles.fidelGlyph]}><Text style={[styles.glyph, index < 4 && { fontSize: 31 }]}>{item.word}</Text></View>
      <View style={{ flex: 1, gap: 3 }}><Text style={styles.wordTitle}>{item.label}</Text><Text style={styles.wordNote}>{item.note}</Text></View>
      <View style={styles.actions}><Pressable accessibilityLabel={`Listen to ${item.label}`} onPress={() => listen(item)} style={styles.listenButton}><Ionicons name="volume-high-outline" size={17} color={TEMARI_COLORS.emerald} /><Text style={styles.listenText}>Listen</Text></Pressable><Pressable accessibilityLabel={`Practice saying ${item.label}`} onPress={() => practice(item)} style={styles.practiceButton}><Ionicons name="mic-outline" size={16} color="#fff" /><Text style={styles.practiceText}>Practice</Text></Pressable></View>
      {readyId === item.id && <Pressable onPress={() => void awardStar()} style={styles.saidIt}><Text style={styles.saidItText}>I said it! +1 practice star</Text></Pressable>}
    </Card>)}
    {message ? <View style={styles.message}><Text style={styles.messageText}>{message}</Text></View> : null}
    {uniqueWords.some((word) => !words.some((item) => item.word === word)) ? <EmptyState title="Your lesson words are ready" body={`New pronunciation words: ${uniqueWords.filter((word) => !words.some((item) => item.word === word)).join(" · ")}`} /> : null}
  </Page>;
}

const styles = StyleSheet.create({ hero: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: TEMARI_COLORS.emeraldDeep, borderRadius: 23, padding: 18 }, kicker: { color: TEMARI_COLORS.saffron, fontWeight: "900", fontSize: 10, letterSpacing: 1.2 }, heroTitle: { color: "#fff", fontSize: 22, lineHeight: 28, fontWeight: "900" }, heroBody: { color: "#DFEEE5", fontSize: 13, lineHeight: 18 }, starBadge: { width: 66, height: 66, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "#FFE8B2" }, starCount: { color: TEMARI_COLORS.ink, fontSize: 12, fontWeight: "900" }, wordCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 }, glyphBox: { width: 49, height: 49, borderRadius: 16, justifyContent: "center", alignItems: "center", backgroundColor: "#EDF2E9" }, fidelGlyph: { backgroundColor: "#FFECC1" }, glyph: { color: TEMARI_COLORS.emeraldDeep, fontSize: 18, fontWeight: "900" }, wordTitle: { color: TEMARI_COLORS.ink, fontSize: 14, fontWeight: "900" }, wordNote: { color: TEMARI_COLORS.muted, fontSize: 11, lineHeight: 15 }, actions: { gap: 5 }, listenButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 10, backgroundColor: "#EAF2E9" }, listenText: { color: TEMARI_COLORS.emerald, fontWeight: "900", fontSize: 10 }, practiceButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 10, backgroundColor: TEMARI_COLORS.emerald }, practiceText: { color: "#fff", fontWeight: "900", fontSize: 10 }, saidIt: { position: "absolute", bottom: -6, right: 12, backgroundColor: "#FFF0C9", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10 }, saidItText: { color: TEMARI_COLORS.ink, fontSize: 10, fontWeight: "900" }, message: { backgroundColor: "#E1F1E4", borderRadius: 12, padding: 12 }, messageText: { color: TEMARI_COLORS.emeraldDeep, fontWeight: "800" },
});
