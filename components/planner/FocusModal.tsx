import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import type { PlannerTask } from "@/lib/planner/types";
import { palette, PrimaryButton, ProgressRing, RoundAction, SoftButton } from "./PlannerUI";

function timeText(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export function FocusModal({ visible, task, remainingSeconds, running, onClose, onToggle, onRestart, onComplete, onStop }: {
  visible: boolean;
  task?: PlannerTask;
  remainingSeconds: number;
  running: boolean;
  onClose: () => void;
  onToggle: () => void;
  onRestart: () => void;
  onComplete: () => void;
  onStop: () => void;
}) {
  const reduceMotion = useReducedMotion();
  if (!task) return null;
  const totalSeconds = task.durationMinutes * 60;
  const progress = totalSeconds ? Math.round(100 * (1 - remainingSeconds / totalSeconds)) : 0;
  return (
    <Modal visible={visible} animationType={reduceMotion ? "none" : "fade"} transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.top}>
            <Text style={styles.eyebrow}>ODAK ZAMANI</Text>
            <RoundAction label="Zamanlayıcıyı kapat" onPress={onClose} size={46}>×</RoundAction>
          </View>
          <Text style={styles.title}>{task.title}</Text>
          <Text style={styles.subtitle}>{running ? "Sadece bu küçük adıma odaklan." : remainingSeconds === 0 ? "Ayırdığın süre tamamlandı." : "Hazır olduğunda kaldığın yerden sürdür."}</Text>
          <View style={styles.timerWrap}>
            <ProgressRing value={progress} size={224} stroke={10} label={`${timeText(remainingSeconds)} kaldı`} />
            <Text accessibilityLiveRegion="polite" style={styles.timer}>{timeText(remainingSeconds)}</Text>
            <Text style={styles.timerCaption}>kalan süre</Text>
          </View>
          <View style={styles.controls}>
            {remainingSeconds === 0 ? <PrimaryButton title="Zamanlayıcıyı yeniden başlat" onPress={onRestart} style={{ flex: 1 }} /> : <PrimaryButton title={running ? "Duraklat" : "Sürdür"} icon={running ? "Ⅱ" : "▶"} onPress={onToggle} style={{ flex: 1 }} />}
            <SoftButton title="Görevi bitir" onPress={onComplete} style={{ flex: 1 }} />
          </View>
          <Pressable onPress={onStop} accessibilityRole="button" style={styles.stopLink}><Text style={styles.stopText}>Zamanlayıcıyı durdur</Text></Pressable>
          <Text style={styles.footnote}>Bir mola gerekirse istediğin an duraklatabilirsin.</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(28,44,38,0.38)", justifyContent: "flex-end", padding: 12 },
  sheet: { backgroundColor: palette.canvas, borderRadius: 28, padding: 22, paddingBottom: 30, maxWidth: 540, width: "100%", alignSelf: "center" },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { color: palette.moss, fontSize: 11, fontWeight: "800", letterSpacing: 1.6 },
  title: { color: palette.ink, fontSize: 23, lineHeight: 30, fontWeight: "700", marginTop: 8 },
  subtitle: { color: palette.muted, fontSize: 14, marginTop: 4 },
  timerWrap: { alignSelf: "center", alignItems: "center", justifyContent: "center", marginTop: 26, marginBottom: 28 },
  timer: { position: "absolute", color: palette.pine, fontSize: 45, fontVariant: ["tabular-nums"], fontWeight: "700", letterSpacing: -1.2 },
  timerCaption: { position: "absolute", top: 143, color: palette.muted, fontSize: 12 },
  controls: { flexDirection: "row", gap: 10 },
  stopLink: { alignSelf: "center", minHeight: 44, justifyContent: "center", paddingHorizontal: 14, marginTop: 8 },
  stopText: { color: palette.muted, fontSize: 13, fontWeight: "600" },
  footnote: { color: palette.muted, fontSize: 12, textAlign: "center", marginTop: 3 },
});
