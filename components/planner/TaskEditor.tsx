import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import type { PlannerTask, Priority } from "@/lib/planner/types";
import { parsePlannerInput } from "@/lib/planner/voice-tasks";
import type { ParsedPlannerTask } from "@/lib/planner/voice-tasks";
import type { TaskDraft } from "@/lib/planner/PlannerProvider";
import { usePlanner } from "@/lib/planner/PlannerProvider";
import { buildSchedule, mergeTaskOrder } from "@/lib/planner/scheduling";
import { VoiceInput } from "./VoiceInput";
import { palette, PrimaryButton, RoundAction, SoftButton } from "./PlannerUI";

export function TaskEditor({ visible, task, onClose, onSave }: {
  visible: boolean;
  task?: PlannerTask | null;
  onClose: () => void;
  onSave: (drafts: TaskDraft[], editId?: string) => Promise<void>;
}) {
  const { tasks } = usePlanner();
  const [text, setText] = useState(task?.title ?? "");
  const [duration, setDuration] = useState(task?.durationMinutes ?? 25);
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "normal");
  const [time, setTime] = useState(task?.timeConstraint ?? "");
  const [reminder, setReminder] = useState(task?.reminder ?? false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const reduceMotion = useReducedMotion();
  const parsed = useMemo(() => task ? (text.trim() ? [{ title: text.trim(), timeConstraint: time || undefined }] : []) : parsePlannerInput(text), [task, text, time]);

  const preview = useMemo(() => {
    const drafts: PlannerTask[] = parsed.map((entry: ParsedPlannerTask, index) => ({
      id: task && index === 0 ? task.id : `preview-${index}`,
      title: entry.title,
      durationMinutes: duration,
      priority,
      reminder,
      timeConstraint: task ? time || undefined : entry.timeConstraint,
      createdAt: task?.createdAt ?? new Date(index).toISOString(),
      sortOrder: index + tasks.length,
    }));
    if (!drafts.length) return [];
    const merged = task ? mergeTaskOrder(tasks, drafts, task.id) : mergeTaskOrder(tasks, drafts);
    return buildSchedule(merged);
  }, [parsed, task, time, duration, priority, reminder, tasks]);

  const handleSave = async () => {
    if (task && time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      setMessage("Saati 24 saat biçiminde yaz: ör. 09:30.");
      return;
    }
    if (!parsed.length) {
      setMessage("Önce bir görev yaz veya sesle ekle.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const drafts: TaskDraft[] = parsed.map((entry) => ({
        title: entry.title,
        durationMinutes: duration,
        priority,
        timeConstraint: task ? time || undefined : entry.timeConstraint,
        reminder,
      }));
      await onSave(drafts, task?.id);
      onClose();
    } catch {
      setMessage("Kaydedilemedi. Bir kez daha deneyebilirsin.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType={reduceMotion ? "none" : "slide"} presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <View style={{ flex: 1 }}><Text style={styles.eyebrow}>{task ? "DÜZENLE" : "YENİ BİR ADIM"}</Text><Text style={styles.heading}>{task ? "Görevi güncelle" : "Aklındakini plana al"}</Text></View>
          <RoundAction label="Paneli kapat" onPress={onClose} size={46}>×</RoundAction>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          {!task ? <>
            <View style={styles.voiceRow}>
              <View style={{ flex: 1, paddingRight: 8 }}><Text style={styles.fieldLabel}>Konuşarak ekle</Text><Text style={styles.helper}>Saatleri ve işleri tek tek söyle; metni sen onayla.</Text></View>
              <View style={{ width: 126 }}><VoiceInput onTranscript={(value) => setText((prev) => [prev, value].filter(Boolean).join("\n"))} onMessage={setMessage} /></View>
            </View>
            <Text style={[styles.fieldLabel, { marginTop: 17 }]}>Görevlerin</Text>
            <TextInput
              value={text}
              onChangeText={(value) => { setText(value); setMessage(""); }}
              placeholder={'Örn. Bugün 9.30’da dersim var, daha sonra 11’de sınava gireceğim'}
              placeholderTextColor="#9CA39B"
              multiline
              textAlignVertical="top"
              accessibilityLabel="Görevleri ve saatleri yaz"
              style={[styles.input, styles.multiline]}
              maxLength={600}
              returnKeyType="default"
            />
            {parsed.length > 0 ? (
              <View style={styles.previewBox}>
                <Text style={styles.previewHeading}>Günün önerilen akışı</Text>
                {preview.map((item) => (
                  <View key={item.id} style={styles.previewRow}>
                    <Text style={styles.previewTime}>{item.plannedTime}</Text>
                    <View style={{ flex: 1 }}><Text style={styles.previewTitle}>{item.title}</Text><Text style={styles.previewNote}>{item.timeConstraint ? "Yazdığın saat sabit" : "Uygun boşluğa yerleştirildi"}</Text></View>
                    {item.scheduleConflict ? <Text style={styles.conflict}>Çakışma</Text> : null}
                  </View>
                ))}
                <Text style={styles.previewFoot}>Başlangıç 08:30 · Süreler arasında 5 dakika pay bırakılır. Planı sonradan değiştirebilirsin.</Text>
              </View>
            ) : null}
          </> : <>
            <Text style={styles.fieldLabel}>Görev adı</Text>
            <TextInput value={text} onChangeText={(value) => { setText(value); setMessage(""); }} placeholder="Bugün ne yapmak istiyorsun?" placeholderTextColor="#9CA39B" accessibilityLabel="Görev adı" style={styles.input} maxLength={100} />
          </>}

          <Text style={[styles.fieldLabel, { marginTop: 18 }]}>Tahmini süre</Text>
          <View style={styles.chips}>
            {[15, 25, 45].map((value) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: duration === value }} onPress={() => setDuration(value)} style={[styles.chip, duration === value && styles.chipSelected]}><Text style={[styles.chipText, duration === value && styles.chipTextSelected]}>{value} dk</Text></Pressable>)}
            <TextInput value={duration.toString()} onChangeText={(value) => setDuration(Math.max(5, Math.min(240, Number(value.replace(/\D/g, "")) || 5)))} keyboardType="number-pad" accessibilityLabel="Dakika cinsinden süre" style={styles.customDuration} maxLength={3} /><Text style={styles.customUnit}>dk</Text>
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 19 }]}>Öncelik</Text>
          <View style={styles.chips}>{([ ["high", "Önemli"], ["normal", "Normal"], ["gentle", "Esnek"] ] as [Priority, string][]).map(([value, label]) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: priority === value }} onPress={() => setPriority(value)} style={[styles.chip, priority === value && styles.chipSelected]}><Text style={[styles.chipText, priority === value && styles.chipTextSelected]}>{label}</Text></Pressable>)}</View>

          {task ? <><Text style={[styles.fieldLabel, { marginTop: 19 }]}>Sabit başlangıç saati <Text style={styles.optional}>(isteğe bağlı)</Text></Text><TextInput value={time} onChangeText={(value) => setTime(value.replace(/[^\d:]/g, "").slice(0, 5))} placeholder="09:30" placeholderTextColor="#9CA39B" keyboardType="numbers-and-punctuation" accessibilityLabel="İsteğe bağlı sabit başlangıç saati" style={[styles.input, { marginTop: 8 }]} /></> : null}

          <View style={styles.reminderRow}>
            <View style={{ flex: 1, paddingRight: 10 }}><Text style={styles.fieldLabel}>Nazik hatırlatıcı</Text><Text style={styles.helper}>Bu adım yaklaşınca bir kez haber ver.</Text></View>
            <Switch value={reminder} onValueChange={setReminder} trackColor={{ false: "#D8D9D2", true: "#A4B9A7" }} thumbColor={reminder ? palette.pine : "#F7F7F3"} accessibilityLabel="Görev hatırlatıcısını aç" />
          </View>
          {message ? <Text accessibilityRole="alert" style={styles.message}>{message}</Text> : null}
          <View style={styles.footer}><SoftButton title="Vazgeç" onPress={onClose} style={{ flex: 1 }} /><PrimaryButton title={task ? "Değişiklikleri kaydet" : "Plana ekle"} onPress={handleSave} disabled={saving} style={{ flex: 1.6 }} /></View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: palette.canvas, paddingHorizontal: 20, paddingTop: 9 },
  handle: { width: 42, height: 4, borderRadius: 2, backgroundColor: "#D8D5CC", alignSelf: "center", marginBottom: 18 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  eyebrow: { color: palette.moss, fontSize: 10, letterSpacing: 1.6, fontWeight: "800", marginBottom: 5 },
  heading: { color: palette.ink, fontSize: 24, lineHeight: 29, letterSpacing: -0.5, fontWeight: "700" },
  content: { paddingBottom: 30 },
  voiceRow: { flexDirection: "row", alignItems: "center", marginTop: 10, padding: 13, borderRadius: 18, backgroundColor: palette.paper, borderColor: palette.line, borderWidth: 1 },
  fieldLabel: { color: palette.ink, fontSize: 14, fontWeight: "700" },
  helper: { color: palette.muted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  input: { minHeight: 48, marginTop: 9, borderRadius: 14, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.paper, paddingHorizontal: 13, paddingVertical: 12, color: palette.ink, fontSize: 15 },
  multiline: { minHeight: 100, lineHeight: 21, paddingTop: 12 },
  previewBox: { marginTop: 11, padding: 13, borderRadius: 16, backgroundColor: palette.pale, borderWidth: 1, borderColor: "#DAE3D9", gap: 8 },
  previewHeading: { color: palette.pine, fontSize: 12, fontWeight: "800", marginBottom: 1 },
  previewRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 3 },
  previewTime: { width: 46, color: palette.pine, fontSize: 12, fontWeight: "800" },
  previewTitle: { color: palette.ink, fontSize: 12, fontWeight: "700" },
  previewNote: { color: palette.muted, fontSize: 10, marginTop: 1 },
  conflict: { color: "#9B4838", fontSize: 10, fontWeight: "800" },
  previewFoot: { color: palette.muted, fontSize: 10, lineHeight: 15, marginTop: 4 },
  chips: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 9 },
  chip: { minHeight: 44, paddingHorizontal: 15, borderRadius: 14, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.paper, alignItems: "center", justifyContent: "center" },
  chipSelected: { borderColor: palette.pine, backgroundColor: palette.pale },
  chipText: { color: palette.moss, fontSize: 13, fontWeight: "600" },
  chipTextSelected: { color: palette.pine, fontWeight: "700" },
  customDuration: { width: 58, height: 44, borderWidth: 1, borderColor: palette.line, borderRadius: 12, textAlign: "center", color: palette.ink, backgroundColor: palette.paper, fontWeight: "700" },
  customUnit: { color: palette.muted, marginLeft: -5, fontSize: 13 },
  optional: { fontWeight: "400", color: palette.muted },
  reminderRow: { marginTop: 18, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.line, flexDirection: "row", alignItems: "center" },
  message: { color: palette.pine, fontSize: 13, lineHeight: 19, marginTop: 14 },
  footer: { flexDirection: "row", gap: 9, marginTop: 20 },
});
