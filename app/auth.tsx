import { useState } from "react";
import { Redirect } from "expo-router";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { BrandLogo } from "@/components/planner/BrandLogo";
import { palette } from "@/components/planner/PlannerUI";
import { startOAuthLogin } from "@/constants/oauth";
import type { LoginFlow } from "@/constants/oauth";
import { useAuth } from "@/lib/_core/AuthProvider";

export default function AuthScreen() {
  const { user, loading } = useAuth();
  const [flow, setFlow] = useState<LoginFlow>("signIn");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  if (loading) {
    return <SafeAreaView style={styles.safe}><View style={styles.loading}><ActivityIndicator color={palette.pine} /><Text style={styles.body}>Hesap durumun kontrol ediliyor…</Text></View></SafeAreaView>;
  }
  if (user) return <Redirect href="/(tabs)" />;

  const begin = async () => {
    setBusy(true);
    setMessage("");
    try {
      await startOAuthLogin(flow);
    } catch {
      setMessage("Güvenli giriş penceresi açılamadı. İnternet bağlantını kontrol edip yeniden dene.");
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.shell}>
          <View style={styles.topLine}>
            <View style={styles.brandTile}><BrandLogo size={36} /></View>
            <View><Text style={styles.brand}>Ritminde</Text><Text style={styles.kicker}>KENDİ RİTMİNDE</Text></View>
          </View>

          <View style={styles.hero}>
            <View style={styles.orbitOuter}><View style={styles.orbitInner}><BrandLogo size={64} /></View></View>
            <View style={styles.sparkOne} /><View style={styles.sparkTwo} />
            <Text style={styles.heroEyebrow}>GÜNÜN, SENİN RİTMİNDE</Text>
            <Text accessibilityRole="header" style={styles.title}>{flow === "signIn" ? "Kendine ayırdığın yere dön." : "Küçük adımlarla başla."}</Text>
            <Text style={styles.subtitle}>Aklındakileri sakin bir sıraya koyalım. Bugün için tek bir sonraki adım yeter.</Text>
          </View>

          <View style={styles.authCard}>
            <View style={styles.segment} accessibilityRole="tablist" accessibilityLabel="Hesap işlemi">
              <Pressable accessibilityRole="tab" accessibilityState={{ selected: flow === "signIn" }} onPress={() => { setFlow("signIn"); setMessage(""); }} style={[styles.segmentButton, flow === "signIn" && styles.segmentActive]}>
                <Text style={[styles.segmentText, flow === "signIn" && styles.segmentTextActive]}>Giriş yap</Text>
              </Pressable>
              <Pressable accessibilityRole="tab" accessibilityState={{ selected: flow === "signUp" }} onPress={() => { setFlow("signUp"); setMessage(""); }} style={[styles.segmentButton, flow === "signUp" && styles.segmentActive]}>
                <Text style={[styles.segmentText, flow === "signUp" && styles.segmentTextActive]}>Üye ol</Text>
              </Pressable>
            </View>

            <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={begin} style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed, busy && styles.disabled]}>
              {busy ? <ActivityIndicator color="#FFFDF7" /> : <Text style={styles.ctaArrow}>→</Text>}
              <Text style={styles.ctaText}>{busy ? "Güvenli bağlantı açılıyor…" : flow === "signIn" ? "Hesabımla devam et" : "Hesabımı oluştur"}</Text>
            </Pressable>
            <Text style={styles.providerNote}>Güvenli Manus hesabı ekranında devam edeceksin. Yeni bir hesap oluşturabilir veya mevcut hesabınla giriş yapabilirsin.</Text>
            {message ? <Text accessibilityRole="alert" style={styles.error}>{message}</Text> : null}
          </View>

          <View style={styles.privacyNote}>
            <View style={styles.privacyGlyph}><Text style={styles.lock}>⌑</Text></View>
            <View style={{ flex: 1 }}><Text style={styles.privacyTitle}>Planın bu cihazda, hesabına özel</Text><Text style={styles.privacyBody}>Başka bir hesapla giriş yapıldığında planlar birbirinden ayrı kalır. Cihazlar arası eşitleme açık değildir.</Text></View>
          </View>

          <Text style={styles.footer}>Üyelik ve oturum, Manus hesabının güvenli giriş akışıyla yönetilir.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.canvas },
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 22, paddingVertical: 28 },
  shell: { width: "100%", maxWidth: 430, alignSelf: "center" },
  topLine: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 25 },
  brandTile: { width: 48, height: 48, borderRadius: 16, backgroundColor: palette.pale, justifyContent: "center", alignItems: "center" },
  brand: { color: palette.pine, fontSize: 18, fontWeight: "800", letterSpacing: -0.5 },
  kicker: { color: palette.muted, fontSize: 8, fontWeight: "800", letterSpacing: 1.5, marginTop: 2 },
  hero: { minHeight: 262, position: "relative", overflow: "hidden", borderRadius: 30, padding: 22, backgroundColor: palette.pale, borderWidth: 1, borderColor: "#DAE3D9", justifyContent: "flex-end" },
  orbitOuter: { position: "absolute", top: 23, right: 26, width: 119, height: 119, borderRadius: 60, borderWidth: 1, borderColor: "#B9CBB9", alignItems: "center", justifyContent: "center" },
  orbitInner: { width: 88, height: 88, borderRadius: 44, backgroundColor: "#E5EDE4", alignItems: "center", justifyContent: "center" },
  sparkOne: { position: "absolute", top: 38, right: 166, width: 7, height: 7, borderRadius: 4, backgroundColor: palette.coral },
  sparkTwo: { position: "absolute", top: 122, right: 49, width: 5, height: 5, borderRadius: 3, backgroundColor: palette.coral, opacity: 0.7 },
  heroEyebrow: { color: palette.moss, fontSize: 9, fontWeight: "800", letterSpacing: 1.4, marginBottom: 8 },
  title: { color: palette.ink, maxWidth: 300, fontSize: 28, lineHeight: 34, fontWeight: "700", letterSpacing: -0.7 },
  subtitle: { color: palette.moss, maxWidth: 315, fontSize: 14, lineHeight: 21, marginTop: 8 },
  authCard: { marginTop: 17, backgroundColor: "#FFFDF7", borderRadius: 23, padding: 15, borderWidth: 1, borderColor: palette.line },
  segment: { minHeight: 48, backgroundColor: "#F1EEE5", borderRadius: 15, padding: 4, flexDirection: "row", gap: 4 },
  segmentButton: { flex: 1, minHeight: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  segmentActive: { backgroundColor: "#FFFDF7", borderWidth: 1, borderColor: "#E7E3DA" },
  segmentText: { color: palette.muted, fontSize: 13, fontWeight: "600" },
  segmentTextActive: { color: palette.pine, fontWeight: "800" },
  cta: { marginTop: 13, minHeight: 56, borderRadius: 16, paddingHorizontal: 17, backgroundColor: palette.pine, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  ctaPressed: { opacity: 0.88 },
  disabled: { opacity: 0.72 },
  ctaArrow: { color: "#FFFDF7", fontSize: 20, fontWeight: "600" },
  ctaText: { color: "#FFFDF7", fontSize: 15, fontWeight: "700" },
  providerNote: { color: palette.muted, textAlign: "center", fontSize: 11, lineHeight: 17, marginTop: 12, paddingHorizontal: 7 },
  error: { color: "#9B4838", fontSize: 12, lineHeight: 18, marginTop: 10, textAlign: "center" },
  privacyNote: { flexDirection: "row", gap: 11, alignItems: "center", marginTop: 17, paddingHorizontal: 5 },
  privacyGlyph: { width: 36, height: 36, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#F7E8DC" },
  lock: { color: palette.pine, fontSize: 21, fontWeight: "700" },
  privacyTitle: { color: palette.ink, fontSize: 12, fontWeight: "700" },
  privacyBody: { color: palette.muted, fontSize: 11, lineHeight: 16, marginTop: 2 },
  footer: { color: palette.muted, fontSize: 10, lineHeight: 15, textAlign: "center", marginTop: 21 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center", gap: 11 },
  body: { color: palette.muted, fontSize: 14 },
});
