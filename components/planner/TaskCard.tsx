import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ScheduledTask } from "@/lib/planner/scheduling";
import { formatDuration } from "@/lib/planner/scheduling";
import { ActivityGlyph } from "./ActivityGlyph";
import { palette, RoundAction } from "./PlannerUI";

export function TaskCard({
  task,
  focused = false,
  index,
  total,
  onToggle,
  onTimer,
  onEdit,
  onMove,
  onRemove,
  moveUpDisabled,
  moveDownDisabled,
}: {
  task: ScheduledTask;
  focused?: boolean;
  index: number;
  total: number;
  onToggle: () => void;
  onTimer: () => void;
  onEdit: () => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
  moveUpDisabled: boolean;
  moveDownDisabled: boolean;
}) {
  const done = Boolean(task.completedAt);
  const priorityLabel = task.priority === "high" ? "Öncelikli" : task.priority === "gentle" ? "Esnek" : "Normal";
  return (
    <View style={styles.row}>
      <View style={styles.timeline}>
        <Text style={[styles.time, done && { color: palette.muted }]}>{task.plannedTime}</Text>
        <View style={styles.rail}>
          <View style={[styles.node, done && styles.nodeDone]}>{done ? <Text style={styles.nodeCheck}>✓</Text> : null}</View>
          {index < total - 1 ? <View style={styles.line} /> : null}
        </View>
      </View>
      <View style={[styles.card, done && styles.cardDone]}>
        <View style={styles.cardTop}>
          <Pressable
            onPress={onToggle}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: done }}
            accessibilityLabel={done ? `${task.title}, tamamlandı` : `${task.title}, tamamlandı olarak işaretle`}
            style={({ pressed }) => [styles.check, done && styles.checkDone, pressed && { opacity: 0.7 }]}
          >
            {done ? <Text style={styles.checkText}>✓</Text> : null}
          </Pressable>
          <ActivityGlyph title={task.title} focused={focused && !done} size={38} />
          <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel={`${task.title} görevini düzenle`} style={styles.taskTextWrap}>
            <Text numberOfLines={2} style={[styles.title, done && styles.titleDone]}>{task.title}</Text>
            <Text style={styles.meta}>{formatDuration(task.durationMinutes)}  ·  {priorityLabel}{task.timeConstraint ? `  ·  ${task.timeConstraint} sabit saat` : ""}</Text>
            {task.scheduleConflict ? <Text accessibilityRole="alert" style={styles.conflict}>Bu saat başka bir adımla çakışıyor. Düzenleyebilirsin.</Text> : null}
          </Pressable>
          <RoundAction label={`${task.title} için zamanlayıcı aç`} onPress={onTimer} disabled={done} size={44} tone={done ? "light" : "dark"}>
            {done ? "↗" : "▶"}
          </RoundAction>
        </View>
        <View style={styles.actions}>
          <Text style={styles.rowHint}>{done ? "Bugün için bir adım tamam." : task.reminder ? "Nazik hatırlatıcı açık" : "Sıradaki küçük adım"}</Text>
          <View style={styles.actionSet}>
            <Pressable onPress={() => onMove(-1)} disabled={moveUpDisabled || done} accessibilityRole="button" accessibilityLabel={`${task.title} görevini yukarı taşı`} style={styles.smallAction}><Text style={[styles.smallActionText, (moveUpDisabled || done) && styles.disabled]}>↑</Text></Pressable>
            <Pressable onPress={() => onMove(1)} disabled={moveDownDisabled || done} accessibilityRole="button" accessibilityLabel={`${task.title} görevini aşağı taşı`} style={styles.smallAction}><Text style={[styles.smallActionText, (moveDownDisabled || done) && styles.disabled]}>↓</Text></Pressable>
            <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel={`${task.title} görevini sil`} style={styles.smallAction}><Text style={[styles.smallActionText, { color: palette.muted }]}>×</Text></Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "stretch", gap: 10, minHeight: 124 },
  timeline: { width: 53, alignItems: "center" },
  time: { color: palette.moss, fontSize: 12, fontWeight: "700", fontVariant: ["tabular-nums"], marginTop: 18 },
  rail: { flex: 1, alignItems: "center", width: "100%", marginTop: 7 },
  node: { width: 10, height: 10, borderRadius: 5, backgroundColor: palette.paper, borderWidth: 2, borderColor: "#B5C1B7", zIndex: 1, alignItems: "center", justifyContent: "center" },
  nodeDone: { width: 20, height: 20, borderRadius: 10, backgroundColor: palette.pine, borderColor: palette.pine, marginTop: -5 },
  nodeCheck: { color: "#fff", fontSize: 12, lineHeight: 15, fontWeight: "700" },
  line: { position: "absolute", top: 7, bottom: -2, width: 1, backgroundColor: palette.line },
  card: { flex: 1, marginBottom: 10, padding: 13, borderRadius: 19, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.paper },
  cardDone: { backgroundColor: "#F4F4ED" },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  check: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.6, borderColor: "#A6B2A8", backgroundColor: palette.paper, alignItems: "center", justifyContent: "center" },
  checkDone: { backgroundColor: palette.pine, borderColor: palette.pine },
  checkText: { color: palette.white, fontSize: 15, fontWeight: "700" },
  taskTextWrap: { flex: 1, minHeight: 48, justifyContent: "center", gap: 3 },
  title: { color: palette.ink, fontSize: 15, lineHeight: 20, fontWeight: "700" },
  titleDone: { color: palette.muted, textDecorationLine: "line-through" },
  meta: { color: palette.muted, fontSize: 11, lineHeight: 16 },
  conflict: { color: "#9B4838", fontSize: 11, lineHeight: 15, fontWeight: "700", marginTop: 4 },
  actions: { borderTopWidth: 1, borderTopColor: palette.line, marginTop: 10, paddingTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  rowHint: { flex: 1, color: palette.moss, fontSize: 11 },
  actionSet: { flexDirection: "row", alignItems: "center", gap: 2 },
  smallAction: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  smallActionText: { color: palette.pine, fontSize: 17, fontWeight: "700" },
  disabled: { opacity: 0.28 },
});
