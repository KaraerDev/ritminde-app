import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { BrandMark, palette, ProgressBar, ProgressRing, SectionTitle, Surface } from "@/components/planner/PlannerUI";
import { BrandLogo } from "@/components/planner/BrandLogo";
import { usePlanner } from "@/lib/planner/PlannerProvider";
import { dateLabel, todayKey } from "@/lib/planner/scheduling";

function lastSevenDays() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = todayKey(date);
    return { key, label: new Intl.DateTimeFormat("tr-TR", { weekday: "narrow" }).format(date).slice(0, 1).toLocaleUpperCase("tr-TR") };
  });
}

export default function ProgressScreen() {
  const { tasks, completions } = usePlanner();
  const done = tasks.filter((task) => task.completedAt).length;
  const percent = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const today = todayKey();
  const totalCompleted = completions.length;
  const onTime = completions.filter((entry) => entry.onTime).length;
  const onTimeRate = totalCompleted ? Math.round((onTime / totalCompleted) * 100) : 0;
  const week = lastSevenDays().map((day) => ({ ...day, count: completions.filter((entry) => entry.date === day.key).length }));
  const max = Math.max(3, ...week.map((day) => day.count));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <View style={styles.topLine}><View style={styles.brand}><View style={styles.logo}><BrandLogo size={28} /></View><Text style={styles.brandName}>Ritminde</Text></View><Text style={styles.kicker}>İLERLEMEN</Text></View>
          <Text style={styles.title}>Küçük adımlar da ilerlemedir.</Text>
          <Text style={styles.subtitle}>{dateLabel()} · kendine ayırdığın zamanı gör.</Text>

          <Surface style={styles.overview}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardEyebrow}>BUGÜNÜN ÖZETİ</Text>
              <Text style={styles.count}>{done}<Text style={styles.countRest}> / {tasks.length} adım</Text></Text>
              <Text style={styles.detail}>{done === 0 ? "Henüz başlamak zorunda değilsin." : done === tasks.length ? "Bugün planladığın her şey tamamlandı." : "Tamamladıkların günün içinde yerini aldı."}</Text>
            </View>
            <ProgressRing value={percent} size={91} label={`Günlük tamamlanma yüzde ${percent}`} />
          </Surface>

          <View style={styles.section}>
            <SectionTitle title="Son 7 gün" detail="Tamamladığın aktiviteler" />
            <Surface style={styles.chartCard} accessibilityLabel="Son yedi gün için tamamlanan görev sütun grafiği">
              <View style={styles.chartStats}><Text style={styles.chartTotal}>{totalCompleted}</Text><Text style={styles.chartLabel}>tamamlanan adım</Text><View style={styles.trend}><Text style={styles.trendIcon}>↗</Text><Text style={styles.trendText}>{totalCompleted ? "Kendi ritminde" : "Başlangıç noktan"}</Text></View></View>
              <View style={styles.chart}>
                {week.map((day) => {
                  const height = Math.max(8, Math.round((day.count / max) * 86));
                  return (
                    <View key={day.key} accessibilityLabel={`${day.label}: ${day.count} tamamlanmış görev`} style={styles.barColumn}>
                      <Text style={styles.barValue}>{day.count || ""}</Text>
                      <View style={styles.barTrack}><View style={[styles.bar, { height, backgroundColor: day.key === today ? palette.pine : day.count ? "#91A394" : "#E6E7DF" }]} /></View>
                      <Text style={[styles.dayLetter, day.key === today && styles.dayToday]}>{day.label}</Text>
                    </View>
                  );
                })}
              </View>
              <Text style={styles.chartNote}>Bu grafik cihazında kaydedilen tamamlamaları gösterir.</Text>
            </Surface>
          </View>

          <View style={styles.section}>
            <SectionTitle title="Planına uyum" detail="Saat kısıtı olan işleri ne kadarında yakaladın?" />
            <Surface style={styles.adherence}>
              <View style={styles.adherenceTop}><View style={styles.clockGlyph}><Text style={styles.clockText}>◷</Text></View><View style={{ flex: 1 }}><Text style={styles.adherenceLabel}>Planlanan zamana yakın</Text><Text style={styles.adherenceSub}>{totalCompleted ? `${onTime} adım kendi zaman aralığında tamamlandı.` : "Tamamladıkça bu ölçüm oluşacak."}</Text></View><Text style={styles.adherencePct}>{onTimeRate}%</Text></View>
              <ProgressBar value={onTimeRate} color={palette.coral} height={7} label={`Planlanan zaman aralığında tamamlanan işler yüzde ${onTimeRate}`} />
            </Surface>
          </View>

          <View style={styles.encouragement}>
            <View style={styles.encouragementMark}><BrandMark size={24} /></View>
            <View style={{ flex: 1 }}><Text style={styles.encouragementTitle}>Kendine alan bırak.</Text><Text style={styles.encouragementBody}>Bir günün değeri, listendeki her kutuyu işaretlemene bağlı değil.</Text></View>
          </View>
          <Text style={styles.privacy}>İlerlemen yalnızca bu cihazda saklanır.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.canvas },
  content: { paddingHorizontal: 19, paddingTop: 12, paddingBottom: 30, flexGrow: 1 },
  container: { width: "100%", maxWidth: 620, alignSelf: "center" },
  topLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 22 },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  logo: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: palette.pale },
  brandName: { color: palette.pine, fontSize: 16, fontWeight: "800" },
  kicker: { color: palette.moss, fontSize: 10, fontWeight: "800", letterSpacing: 1.3 },
  title: { color: palette.ink, fontSize: 28, lineHeight: 34, fontWeight: "700", letterSpacing: -0.7 },
  subtitle: { color: palette.muted, fontSize: 14, marginTop: 6, textTransform: "capitalize" },
  overview: { marginTop: 22, flexDirection: "row", alignItems: "center", gap: 10, padding: 20, backgroundColor: palette.pale, borderColor: "#DAE3D9" },
  cardEyebrow: { color: palette.moss, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  count: { color: palette.pine, fontSize: 32, fontWeight: "800", marginTop: 6, letterSpacing: -1 },
  countRest: { color: palette.moss, fontSize: 15, fontWeight: "600", letterSpacing: 0 },
  detail: { color: palette.moss, fontSize: 12, lineHeight: 17, marginTop: 4, maxWidth: 230 },
  section: { marginTop: 27 },
  chartCard: { padding: 18 },
  chartStats: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", gap: 8 },
  chartTotal: { color: palette.pine, fontSize: 28, fontWeight: "800" },
  chartLabel: { color: palette.muted, fontSize: 12 },
  trend: { marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 3 },
  trendIcon: { color: palette.coral, fontSize: 15, fontWeight: "800" },
  trendText: { color: palette.moss, fontSize: 11 },
  chart: { flexDirection: "row", alignItems: "flex-end", height: 138, gap: 8, marginTop: 13 },
  barColumn: { flex: 1, height: "100%", alignItems: "center", justifyContent: "flex-end" },
  barValue: { height: 16, color: palette.moss, fontSize: 10, fontWeight: "700" },
  barTrack: { height: 90, width: "70%", alignItems: "center", justifyContent: "flex-end", borderRadius: 9, overflow: "hidden" },
  bar: { width: "100%", borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  dayLetter: { color: palette.muted, fontSize: 10, fontWeight: "700", marginTop: 8 },
  dayToday: { color: palette.pine },
  chartNote: { color: palette.muted, fontSize: 11, marginTop: 14, lineHeight: 16 },
  adherence: { gap: 14, padding: 17 },
  adherenceTop: { flexDirection: "row", alignItems: "center", gap: 11 },
  clockGlyph: { width: 39, height: 39, borderRadius: 14, backgroundColor: "#F9EEE5", alignItems: "center", justifyContent: "center" },
  clockText: { color: palette.coral, fontSize: 21 },
  adherenceLabel: { color: palette.ink, fontSize: 14, fontWeight: "700" },
  adherenceSub: { color: palette.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  adherencePct: { color: palette.pine, fontSize: 18, fontWeight: "800" },
  encouragement: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#F1EEE5", padding: 15, borderRadius: 18, marginTop: 23 },
  encouragementMark: { width: 38, height: 38, borderRadius: 14, backgroundColor: palette.paper, alignItems: "center", justifyContent: "center" },
  encouragementTitle: { color: palette.ink, fontSize: 13, fontWeight: "700" },
  encouragementBody: { color: palette.muted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  privacy: { color: palette.muted, fontSize: 11, textAlign: "center", marginTop: 18 },
});
