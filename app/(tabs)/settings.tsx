import { useState } from "react";
import { Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { BrandMark, palette, SectionTitle, Surface } from "@/components/planner/PlannerUI";
import { BrandLogo } from "@/components/planner/BrandLogo";
import { usePlanner } from "@/lib/planner/PlannerProvider";
import { useAuth } from "@/lib/_core/AuthProvider";
import { enableLocalReminders } from "@/lib/planner/notifications";

export default function SettingsScreen() {
  const { preferences, updatePreferences } = usePlanner();
  const { user, signOut } = useAuth();
  const [message, setMessage] = useState("");
  const [accountMessage, setAccountMessage] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const accountName = user?.name?.trim() || "Ritminde üyesi";
  const handleSignOut = async () => {
    setSigningOut(true);
    setAccountMessage("");
    try { await signOut(); }
    catch { setAccountMessage("Oturum kapatılamadı. İnternet bağlantını kontrol edip yeniden dene."); }
    finally { setSigningOut(false); }
  };
  const toggleReminders = async (enabled: boolean) => {
    if (!enabled) {
      updatePreferences({ remindersEnabled: false });
      setMessage("Hatırlatıcılar duraklatıldı. Planın olduğu gibi duruyor.");
      return;
    }
    if (Platform.OS === "web") {
      setMessage("Cihaz bildirimleri iOS veya Android uygulamasında kullanılabilir. Önizlemede görev planlamaya devam edebilirsin.");
      return;
    }
    const granted = await enableLocalReminders().catch(() => false);
    if (granted) {
      updatePreferences({ remindersEnabled: true });
      setMessage("Nazik görev hatırlatıcıları açıldı.");
    } else {
      setMessage("Bildirim izni verilmedi. Ayarlardan tekrar açabilir veya hatırlatıcısız devam edebilirsin.");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <View style={styles.brand}><View style={styles.logo}><BrandLogo size={28} /></View><View><Text style={styles.brandName}>Ritminde</Text><Text style={styles.brandSub}>GÜNÜNÜ SAKİNCE AYARLA</Text></View></View>
          <Text style={styles.title}>Hesabın ve tercihler</Text>
          <Text style={styles.subtitle}>Planın hesabına özel; nazik hatırlatıcılar tamamen senin kontrolünde.</Text>

          <View style={styles.section}>
            <SectionTitle title="Hesap" detail="Planların bu cihazda hesap bazında ayrı saklanır." />
            <Surface style={styles.accountCard}>
              <View style={styles.accountRow}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{accountName.charAt(0).toLocaleUpperCase("tr-TR")}</Text></View>
                <View style={{ flex: 1 }}><Text style={styles.settingTitle}>{accountName}</Text><Text style={styles.settingDetail}>{user?.email || "Manus hesabıyla oturum açıldı"}</Text></View>
              </View>
              <View style={styles.divider} />
              <Pressable accessibilityRole="button" accessibilityLabel="Ritminde hesabından çıkış yap" accessibilityState={{ disabled: signingOut }} disabled={signingOut} onPress={handleSignOut} style={styles.signOutButton}>
                <Text style={styles.signOutText}>{signingOut ? "Oturum kapatılıyor…" : "Oturumu kapat"}</Text><Text style={styles.signOutArrow}>↗</Text>
              </Pressable>
            </Surface>
            {accountMessage ? <Text accessibilityRole="alert" style={styles.message}>{accountMessage}</Text> : null}
          </View>

          <View style={styles.section}>
            <SectionTitle title="Hatırlatıcılar" detail="Seyrek, kısa ve görev odaklı." />
            <Surface style={styles.settingsCard}>
              <SettingRow title="Görev bildirimleri" detail="İzin verirsen cihazında yerel hatırlatıcı kurulur." value={preferences.remindersEnabled} onChange={toggleReminders} />
              <View style={styles.divider} />
              <View style={styles.preferenceRow}>
                <View style={{ flex: 1, paddingRight: 12 }}><Text style={styles.settingTitle}>Günlük üst sınır</Text><Text style={styles.settingDetail}>Bir günde en fazla kaç hatırlatma?</Text></View>
                <View style={styles.limitChoices}>
                  {([1, 2, 3] as const).map((limit) => <Pressable key={limit} onPress={() => updatePreferences({ dailyReminderLimit: limit })} accessibilityRole="radio" accessibilityState={{ selected: preferences.dailyReminderLimit === limit }} accessibilityLabel={`Günde en fazla ${limit} hatırlatma`} style={[styles.limitChip, preferences.dailyReminderLimit === limit && styles.limitChipSelected]}><Text style={[styles.limitText, preferences.dailyReminderLimit === limit && styles.limitTextSelected]}>{limit}</Text></Pressable>)}
                </View>
              </View>
              <View style={styles.divider} />
              <SettingRow title="Hafif bildirim sesi" detail="Kapalıysa bildirim sessiz gelir." value={preferences.gentleSound} onChange={(value) => updatePreferences({ gentleSound: value })} />
            </Surface>
            {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}
          </View>

          <View style={styles.section}>
            <SectionTitle title="Kullanım rahatlığı" detail="Bildirim olmasa da planlayıcının ana işlevleri çalışır." />
            <Surface style={styles.tipCard}>
              <View style={styles.tipIcon}><Text style={styles.tipGlyph}>◌</Text></View><View style={{ flex: 1 }}><Text style={styles.settingTitle}>Daha az hareket</Text><Text style={styles.settingDetail}>Uygulama sistemin hareket azaltma tercihlerine uyar.</Text></View>
            </Surface>
            <Surface style={styles.tipCard}>
              <View style={[styles.tipIcon, { backgroundColor: "#F8E9E2" }]}><Text style={[styles.tipGlyph, { color: palette.coral }]}>⌁</Text></View><View style={{ flex: 1 }}><Text style={styles.settingTitle}>Üyeliğine özel yerel plan</Text><Text style={styles.settingDetail}>Bu cihazda hesaplar birbirinden ayrılır; cihazlar arasında otomatik eşitleme yapılmaz.</Text></View>
            </Surface>
          </View>

          <View style={styles.note}><BrandMark size={24} /><Text style={styles.noteText}>Bugünün planı esnek. Bir şeyi ertelemek de planın parçası olabilir.</Text></View>
          <Text style={styles.version}>RİTMİNDE · GÜNÜN SENİN RİTMİNDE</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingRow({ title, detail, value, onChange }: { title: string; detail: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <View style={styles.preferenceRow}>
      <View style={{ flex: 1, paddingRight: 12 }}><Text style={styles.settingTitle}>{title}</Text><Text style={styles.settingDetail}>{detail}</Text></View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: "#D8D9D2", true: "#A4B9A7" }} thumbColor={value ? palette.pine : "#F7F7F3"} accessibilityLabel={title} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.canvas },
  content: { paddingHorizontal: 19, paddingTop: 15, paddingBottom: 30, flexGrow: 1 },
  container: { width: "100%", maxWidth: 620, alignSelf: "center" },
  brand: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 22 },
  logo: { width: 39, height: 39, borderRadius: 14, backgroundColor: palette.pale, alignItems: "center", justifyContent: "center" },
  brandName: { color: palette.pine, fontSize: 16, fontWeight: "800" },
  brandSub: { color: palette.muted, fontSize: 8, letterSpacing: 1.3, fontWeight: "800", marginTop: 2 },
  title: { color: palette.ink, fontSize: 28, lineHeight: 34, fontWeight: "700", letterSpacing: -0.6 },
  subtitle: { color: palette.muted, fontSize: 14, lineHeight: 20, marginTop: 7 },
  section: { marginTop: 27 },
  settingsCard: { paddingVertical: 2, paddingHorizontal: 16 },
  accountCard: { paddingHorizontal: 16, paddingVertical: 2 },
  accountRow: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  avatar: { width: 44, height: 44, borderRadius: 16, backgroundColor: palette.pale, alignItems: "center", justifyContent: "center" },
  avatarText: { color: palette.pine, fontSize: 17, fontWeight: "800" },
  signOutButton: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  signOutText: { color: "#9B4838", fontSize: 13, fontWeight: "700" },
  signOutArrow: { color: "#9B4838", fontSize: 17 },
  preferenceRow: { minHeight: 74, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 12 },
  settingTitle: { color: palette.ink, fontSize: 14, fontWeight: "700" },
  settingDetail: { color: palette.muted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  divider: { height: 1, backgroundColor: palette.line },
  limitChoices: { flexDirection: "row", gap: 5 },
  limitChip: { width: 34, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: palette.soft, borderWidth: 1, borderColor: palette.line },
  limitChipSelected: { backgroundColor: palette.pale, borderColor: palette.pine },
  limitText: { color: palette.moss, fontSize: 13, fontWeight: "700" },
  limitTextSelected: { color: palette.pine },
  message: { color: palette.pine, backgroundColor: palette.pale, borderRadius: 13, padding: 12, fontSize: 12, lineHeight: 18, marginTop: 10 },
  tipCard: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 9, padding: 15 },
  tipIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: palette.pale, alignItems: "center", justifyContent: "center" },
  tipGlyph: { fontSize: 24, color: palette.pine },
  note: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#F1EEE5", padding: 15, borderRadius: 18, marginTop: 26 },
  noteText: { flex: 1, color: palette.moss, fontSize: 13, lineHeight: 20 },
  version: { color: "#9DA39B", fontSize: 9, fontWeight: "800", letterSpacing: 1.3, textAlign: "center", marginTop: 22 },
});
