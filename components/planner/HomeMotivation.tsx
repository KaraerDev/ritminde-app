import { Pressable, StyleSheet, Text, View } from "react-native";
import { BrandLogo } from "@/components/planner/BrandLogo";
import { palette, Surface } from "@/components/planner/PlannerUI";
import { formatDuration, type ScheduledTask } from "@/lib/planner/scheduling";

type HomeMotivationProps = {
  completedCount: number;
  totalCount: number;
  nextTask: ScheduledTask | null;
  timerState: "running" | "paused" | "expired" | null;
  onFocus: () => void;
};

export function HomeMotivation({ completedCount, totalCount, nextTask, timerState, onFocus }: HomeMotivationProps) {
  if (totalCount === 0) return null;

  const allDone = completedCount >= totalCount;
  const safeCompletedCount = Math.min(completedCount, totalCount);
  const taskHeading = timerState === "running" ? "ODAĞIN DEVAM EDİYOR" : timerState === "paused" ? "KISA BİR MOLA" : timerState === "expired" ? "AYIRDIĞIN SÜRE TAMAMLANDI" : nextTask ? "SIRADAKİ ADIM" : "GÜNÜN KAPANIŞI";
  const actionTitle = timerState === "running" ? "Görüntüle" : timerState === "paused" ? "Sürdür" : timerState === "expired" ? "Yeniden başlat" : "Odaklan";
  const actionGlyph = timerState === "running" ? "↗" : timerState === "expired" ? "↻" : "▶";

  return (
    <View style={styles.row}>
      <Surface style={[styles.widget, styles.winCard]}>
        <View style={styles.widgetLabelRow}>
          <View style={styles.mark}><BrandLogo size={18} /></View>
          <Text style={styles.eyebrow}>BUGÜNÜN KAZANIMI</Text>
        </View>
        {safeCompletedCount > 0 ? (
          <>
            <Text style={styles.winNumber}>{safeCompletedCount}</Text>
            <Text style={styles.winLabel}>adım tamamlandı</Text>
            <Text style={styles.body}>{allDone ? "Bugün için güzelce ilerledin. Kendine de zaman bırak." : "Bugüne kattığın her küçük adım değerli."}</Text>
          </>
        ) : (
          <>
            <Text style={styles.firstStep}>Tek adım yeter.</Text>
            <Text style={styles.body}>Küçük bir başlangıç da ilerlemedir.</Text>
          </>
        )}
      </Surface>

      <Surface style={[styles.widget, styles.nextCard]}>
        <Text style={styles.eyebrow}>{taskHeading}</Text>
        {nextTask ? (
          <>
            <View style={styles.taskMeta}>
              <Text style={styles.taskTime}>{nextTask.plannedTime}</Text>
              <Text style={styles.duration}>{formatDuration(nextTask.durationMinutes)}</Text>
            </View>
            <Text numberOfLines={2} style={styles.taskTitle}>{nextTask.title}</Text>
            <Pressable
              onPress={onFocus}
              accessibilityRole="button"
              accessibilityLabel={timerState === "running" ? `${nextTask.title} için çalışan zamanlayıcıyı görüntüle` : timerState === "paused" ? `${nextTask.title} zamanlayıcısını sürdür` : timerState === "expired" ? `${nextTask.title} zamanlayıcısını yeniden başlat` : `${nextTask.title} için odak zamanlayıcısını başlat`}
              style={({ pressed }) => [styles.focusButton, pressed && styles.pressed]}
            >
              <Text style={styles.focusGlyph} aria-hidden>{actionGlyph}</Text>
              <Text style={styles.focusLabel}>{actionTitle}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.doneTitle}>Bugünlük tamam.</Text>
            <Text style={styles.body}>Şimdi kendine biraz alan açabilirsin.</Text>
          </>
        )}
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "stretch", gap: 11, marginTop: 17 },
  widget: { flex: 1, minWidth: 0, padding: 15, borderRadius: 21, minHeight: 180 },
  winCard: { backgroundColor: "#E7EEE7", borderColor: "#DCE6DC" },
  nextCard: { backgroundColor: "#F8EAE0", borderColor: "#EEDDD1" },
  widgetLabelRow: { flexDirection: "row", alignItems: "center", gap: 7, minHeight: 25 },
  mark: { width: 25, height: 25, borderRadius: 9, backgroundColor: "#D3E0D4", alignItems: "center", justifyContent: "center" },
  eyebrow: { color: palette.moss, fontSize: 8, lineHeight: 12, letterSpacing: 0.9, fontWeight: "800", flexShrink: 1 },
  winNumber: { color: palette.pine, fontSize: 31, lineHeight: 36, fontWeight: "800", marginTop: 12 },
  winLabel: { color: palette.moss, fontSize: 10, lineHeight: 14, fontWeight: "700", marginTop: 1 },
  firstStep: { color: palette.pine, fontSize: 18, lineHeight: 23, fontWeight: "800", marginTop: 18 },
  body: { color: palette.muted, fontSize: 11, lineHeight: 16, marginTop: 6 },
  taskMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4, marginTop: 14 },
  taskTime: { color: palette.pine, fontSize: 16, lineHeight: 21, fontWeight: "800", fontVariant: ["tabular-nums"] },
  duration: { color: palette.moss, fontSize: 10, lineHeight: 14, fontWeight: "600" },
  taskTitle: { color: palette.ink, fontSize: 13, lineHeight: 17, fontWeight: "700", marginTop: 4, minHeight: 34 },
  focusButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, minHeight: 44, borderRadius: 14, backgroundColor: palette.pine, marginTop: "auto", paddingHorizontal: 8 },
  focusGlyph: { color: palette.white, fontSize: 12, fontWeight: "700" },
  focusLabel: { color: palette.white, fontSize: 12, fontWeight: "700" },
  doneTitle: { color: palette.ink, fontSize: 16, lineHeight: 22, fontWeight: "800", marginTop: 16 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
