import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AppHeader, Card, Page, PrimaryButton, SectionTitle, sharedStyles } from "@/components/temari/ui";
import { TEMARI_COLORS } from "@/constants/temari";
import { useTemari } from "@/lib/temari/TemariProvider";

type Checkout = { tx_ref: string; checkout_url: string; mock?: boolean };

export default function RewardsScreen() {
  const { user, apiRequest, apiBaseUrl, refreshProfile } = useTemari();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [txRef, setTxRef] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mock, setMock] = useState(false);

  const startCheckout = async () => {
    setError(""); setMessage("");
    const validPhone = /^(09|07)\d{8}$/.test(phone.replace(/[\s-]/g, ""));
    if (name.trim().length < 2) { setError("Enter the sponsor’s name."); return; }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError("Enter a valid sponsor email address."); return; }
    if (!validPhone) { setError("Use a 10-digit Ethiopian mobile number starting with 09 or 07."); return; }
    setBusy(true);
    try {
      const result = await apiRequest<Checkout>("/chapa/initialize", { method: "POST", body: { sponsor_name: name.trim(), email: email.trim(), phone_number: phone.replace(/[\s-]/g, ""), amount_etb: 50, student_id: user?.id } });
      setTxRef(result.tx_ref); setMock(Boolean(result.mock));
      const checkoutUrl = /^https?:\/\//i.test(result.checkout_url) ? result.checkout_url : `${apiBaseUrl.replace(/\/api$/, "")}${result.checkout_url}`;
      if (Platform.OS === "web" && typeof window !== "undefined") window.open(checkoutUrl, "_blank", "noopener,noreferrer");
      else await WebBrowser.openBrowserAsync(checkoutUrl);
      setMessage(result.mock ? "Demo checkout opened. Approve it there, then tap Verify below." : "Chapa checkout opened. After payment, return here and tap Verify.");
    } catch (err) { setError(err instanceof Error ? err.message : "Checkout could not start. Please try again."); }
    finally { setBusy(false); }
  };

  const verifyCheckout = async () => {
    if (!txRef) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await apiRequest<{ status: string; awardedCoins?: number; message?: string }>(`/chapa/verify/${encodeURIComponent(txRef)}`);
      await refreshProfile();
      setMessage(result.message || (result.status === "completed" ? `Sponsorship confirmed${result.awardedCoins ? ` · +${result.awardedCoins} coins` : ""}. Thank you!` : `Transaction status: ${result.status}.`));
    } catch (err) { setError(err instanceof Error ? err.message : "We could not verify this transaction."); }
    finally { setBusy(false); }
  };

  return <Page>
    <AppHeader subtitle="Rewards & community support" />
    <View style={styles.hero}><View style={styles.heroIcon}><Ionicons name="heart" size={26} color="#C75B51" /></View><Text style={styles.kicker}>SHARE THE SPARK</Text><Text style={styles.heroTitle}>Open a door to learning.</Text><Text style={styles.heroBody}>A 50 ETB sponsorship helps a learner keep exploring. Checkout can use Chapa, Telebirr, or CBE Birr.</Text><View style={styles.amountPill}><Text style={styles.amount}>50 ETB</Text><Text style={styles.amountLabel}>one-time sponsorship</Text></View></View>
    <Card><SectionTitle eyebrow="Sponsor a learner" title="Make a learning gift" body={user ? `Your account will be the learner supported (ID ${user.id}).` : "Choose a learner ID with your teacher."} />
      <Text style={styles.label}>Sponsor name</Text><TextInput value={name} onChangeText={setName} placeholder="Name of sponsor" style={sharedStyles.input} autoCapitalize="words" />
      <Text style={styles.label}>Sponsor email</Text><TextInput value={email} onChangeText={setEmail} placeholder="sponsor@example.com" style={sharedStyles.input} keyboardType="email-address" autoCapitalize="none" />
      <Text style={styles.label}>Ethiopian mobile number</Text><TextInput value={phone} onChangeText={setPhone} placeholder="09XXXXXXXX or 07XXXXXXXX" style={sharedStyles.input} keyboardType="phone-pad" maxLength={14} />
      <View style={styles.amountRow}><Text style={styles.label}>Gift amount</Text><View style={styles.amountField}><Text style={styles.amountValue}>50 ETB</Text><Text style={styles.fixedLabel}>FIXED</Text></View></View>
      <PrimaryButton label="Continue to checkout" onPress={() => void startCheckout()} loading={busy} />
      {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
      {message ? <View style={styles.successBox}><Text style={styles.successText}>{message}</Text></View> : null}
      {txRef ? <View style={styles.verifyRow}><Text style={styles.txText} numberOfLines={1}>Reference: {txRef}{mock ? " · Demo" : ""}</Text><Pressable onPress={() => void verifyCheckout()} disabled={busy} style={styles.verifyButton}><Text style={styles.verifyText}>Verify transaction</Text></Pressable></View> : null}
    </Card>
    <View style={styles.safeNote}><Ionicons name="shield-checkmark-outline" size={18} color={TEMARI_COLORS.emerald} /><Text style={styles.safeText}>Payments happen on Chapa’s secure checkout when configured. Without a Chapa key, the server uses a clearly marked local demo flow.</Text></View>
  </Page>;
}

const styles = StyleSheet.create({ hero: { backgroundColor: TEMARI_COLORS.emeraldDeep, borderRadius: 23, padding: 20, gap: 8 }, heroIcon: { width: 47, height: 47, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF2EA" }, kicker: { color: TEMARI_COLORS.saffron, fontSize: 10, fontWeight: "900", letterSpacing: 1.3 }, heroTitle: { color: "#fff", fontSize: 25, fontWeight: "900" }, heroBody: { color: "#DFEEE5", fontSize: 14, lineHeight: 21 }, amountPill: { alignSelf: "flex-start", backgroundColor: "#F2B84B", paddingHorizontal: 13, paddingVertical: 8, borderRadius: 13, marginTop: 2 }, amount: { color: TEMARI_COLORS.ink, fontSize: 16, fontWeight: "900" }, amountLabel: { color: "#563B10", fontSize: 10, fontWeight: "800" }, label: { color: TEMARI_COLORS.ink, fontSize: 13, fontWeight: "800", marginBottom: -5 }, amountRow: { gap: 7 }, amountField: { height: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, backgroundColor: "#F5F1E7", borderRadius: 14, borderWidth: 1, borderColor: TEMARI_COLORS.border }, amountValue: { color: TEMARI_COLORS.ink, fontWeight: "900" }, fixedLabel: { color: TEMARI_COLORS.muted, fontSize: 10, fontWeight: "900", letterSpacing: 1 }, errorBox: { padding: 11, borderRadius: 12, backgroundColor: "#FFF0EA" }, errorText: { color: "#A04335", fontSize: 13, fontWeight: "700" }, successBox: { padding: 11, borderRadius: 12, backgroundColor: "#E5F1E5" }, successText: { color: TEMARI_COLORS.emeraldDeep, fontSize: 13, fontWeight: "800" }, verifyRow: { paddingTop: 6, gap: 8 }, txText: { color: TEMARI_COLORS.muted, fontSize: 11 }, verifyButton: { alignSelf: "flex-start", backgroundColor: "#FFF0C9", paddingVertical: 9, paddingHorizontal: 12, borderRadius: 12 }, verifyText: { color: TEMARI_COLORS.ink, fontWeight: "900", fontSize: 12 }, safeNote: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingHorizontal: 4 }, safeText: { flex: 1, color: TEMARI_COLORS.muted, fontSize: 11, lineHeight: 16 },
});
