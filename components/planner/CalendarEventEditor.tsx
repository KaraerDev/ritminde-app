import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import type { CalendarSaveResult } from "@/lib/planner/PlannerProvider";
import type { CalendarEventDraft, CalendarReminderOffset, PlannerCalendarEvent } from "@/lib/planner/types";
import { calendarDateLabel, isCalendarDateInPast, isValidCalendarTime, localEventDate, reminderChoices } from "@/lib/planner/calendar";
import { palette, PrimaryButton, RoundAction, SoftButton } from "./PlannerUI";

type CalendarEventEditorProps = {
  visible: boolean;
  dateKey: string;
  event?: PlannerCalendarEvent | null;
  onClose: () => void;
  onSave: (draft: CalendarEventDraft, editId?: string) => Promise<CalendarSaveResult>;
};

export function CalendarEventEditor({ visible, dateKey, event, onClose, onSave }: CalendarEventEditorProps) {
  const [title, setTitle] = useState(event?.title ?? "");
  const [time, setTime] = useState(event?.time ?? "09:00");
  const [durationMinutes, setDurationMinutes] = useState(event?.durationMinutes ?? 60);
  const [reminderEnabled, setReminderEnabled] = useState(event?.reminderEnabled ?? true);
  const [reminderOffsetMinutes, setReminderOffsetMinutes] = useState<CalendarReminderOffset>(event?.reminderOffsetMinutes ?? 10);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const reduceMotion = useReducedMotion();

  const handleSave = async () => {
    if (!title.trim()) {
      setMessage("Plana kısa bir ad ver.");
      return;
    }
    if (!isValidCalendarTime(time)) {
      setMessage("Saati 24 saat biçiminde yaz: ör. 09:30.");
      return;
    }
    const eventDate = localEventDate(dateKey, time);
    if (!eventDate) {
      setMessage("Bu tarih ve saat cihazının yerel saatinde geçerli değil. Başka bir saat seç.");
      return;
    }
    if (isCalendarDateInPast(dateKey) || eventDate.getTime() <= Date.now()) {
      setMessage("Bugün veya daha sonraki bir zamanda gelecek bir saat seç.");
      return;
    }

    const draft: CalendarEventDraft = {
      title: title.trim(),
      dateKey,
      time,
      durationMinutes,
      reminderEnabled,
      reminderOffsetMinutes,
    };
    setSaving(true);
    setMessage("");
    try {
      await onSave(draft, event?.id);
      onClose();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Plan kaydedilemedi. Yeniden deneyebilirsin.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType={reduceMotion ? "none" : "slide"} presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>{event ? "PLANI DÜZENLE" : "GELECEK PLANI"}</Text>
            <Text accessibilityRole="header" style={styles.heading}>{event ? "Planını güncelle" : "Takvimine ekle"}</Text>
            <Text style={styles.date}>{calendarDateLabel(dateKey)}</Text>
          </View>
          <RoundAction label="Takvim panelini kapat" onPress={onClose} size={46}>×</RoundAction>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Text style={styles.fieldLabel}>Plan adı</Text>
          <TextInput
            value={title}
            onChangeText={(value) => { setTitle(value); setMessage(""); }}
            placeholder="Örn. Doktor randevusu"
            placeholderTextColor="#9CA39B"
            accessibilityLabel="Takvim planı adı"
            style={styles.input}
            maxLength={100}
            returnKeyType="next"
          />

          <Text style={[styles.fieldLabel, styles.sectionLabel]}>Başlangıç saati</Text>
          <TextInput
            value={time}
            onChangeText={(value) => { setTime(value.replace(/[^\d:]/g, "").slice(0, 5)); setMessage(""); }}
            placeholder="09:30"
            placeholderTextColor="#9CA39B"
            keyboardType="numbers-and-punctuation"
            accessibilityLabel="Planın yerel başlangıç saati"
            style={[styles.input, styles.timeInput]}
            maxLength={5}
          />
          <Text style={styles.helper}>Saat, cihazının yerel saat diliminde kullanılır.</Text>

          <Text style={[styles.fieldLabel, styles.sectionLabel]}>Plan süresi</Text>
          <View style={styles.durationChoices}>
            {[15, 30, 45, 60, 90, 120].map((value) => {
              const selected = durationMinutes === value;
              const label = value < 60 ? `${value} dk` : value % 60 ? `${Math.floor(value / 60)} sa ${value % 60} dk` : `${value / 60} sa`;
              return (
                <Pressable
                  key={value}
                  onPress={() => setDurationMinutes(value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Plan süresi ${label}`}
                  style={[styles.durationChoice, selected && styles.durationChoiceSelected]}
                >
                  <Text style={[styles.durationChoiceText, selected && styles.durationChoiceTextSelected]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.reminderRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.fieldLabel}>Hatırlatıcı</Text>
              <Text style={styles.helper}>Bu plan için tek seferlik bildirim kur.</Text>
            </View>
            <Switch
              value={reminderEnabled}
              onValueChange={setReminderEnabled}
              trackColor={{ false: "#D8D9D2", true: "#A4B9A7" }}
              thumbColor={reminderEnabled ? palette.pine : "#F7F7F3"}
              accessibilityLabel="Bu plan için hatırlatıcıyı aç"
            />
          </View>

          {reminderEnabled ? (
            <>
              <Text style={[styles.fieldLabel, styles.sectionLabel]}>Ne zaman haber verelim?</Text>
              <View style={styles.choices}>
                {reminderChoices.map((choice) => {
                  const selected = reminderOffsetMinutes === choice.offset;
                  return (
                    <Pressable
                      key={choice.offset}
                      onPress={() => setReminderOffsetMinutes(choice.offset)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`Hatırlatıcı: ${choice.label}`}
                      style={[styles.choice, selected && styles.choiceSelected]}
                    >
                      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{choice.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          {message ? <Text accessibilityRole="alert" style={styles.message}>{message}</Text> : null}
          <View style={styles.footer}>
            <SoftButton title="Vazgeç" onPress={onClose} style={{ flex: 1 }} />
            <PrimaryButton title={saving ? "Kaydediliyor…" : event ? "Planı kaydet" : "Takvime ekle"} onPress={handleSave} disabled={saving} style={{ flex: 1.5 }} />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: palette.canvas, paddingHorizontal: 20, paddingTop: 9 },
  handle: { width: 42, height: 4, borderRadius: 2, backgroundColor: "#D8D5CC", alignSelf: "center", marginBottom: 18 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 17 },
  eyebrow: { color: palette.moss, fontSize: 10, letterSpacing: 1.6, fontWeight: "800", marginBottom: 5 },
  heading: { color: palette.ink, fontSize: 24, lineHeight: 29, letterSpacing: -0.5, fontWeight: "700" },
  date: { color: palette.muted, fontSize: 13, marginTop: 4, textTransform: "capitalize" },
  content: { paddingBottom: 28 },
  fieldLabel: { color: palette.ink, fontSize: 14, fontWeight: "700" },
  sectionLabel: { marginTop: 20 },
  input: { minHeight: 48, marginTop: 9, borderRadius: 14, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.paper, paddingHorizontal: 13, paddingVertical: 12, color: palette.ink, fontSize: 15 },
  timeInput: { maxWidth: 150, fontVariant: ["tabular-nums"] },
  helper: { color: palette.muted, fontSize: 12, lineHeight: 17, marginTop: 4 },
  reminderRow: { marginTop: 20, minHeight: 70, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.line, flexDirection: "row", alignItems: "center" },
  durationChoices: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 9 },
  durationChoice: { minHeight: 44, minWidth: 72, flexGrow: 1, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.paper, alignItems: "center", justifyContent: "center" },
  durationChoiceSelected: { borderColor: palette.pine, backgroundColor: palette.pale },
  durationChoiceText: { color: palette.moss, fontSize: 12, fontWeight: "600" },
  durationChoiceTextSelected: { color: palette.pine, fontWeight: "800" },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 9 },
  choice: { minHeight: 44, minWidth: 66, flexGrow: 1, paddingHorizontal: 11, borderRadius: 14, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.paper, alignItems: "center", justifyContent: "center" },
  choiceSelected: { borderColor: palette.pine, backgroundColor: palette.pale },
  choiceText: { color: palette.moss, fontSize: 12, fontWeight: "600" },
  choiceTextSelected: { color: palette.pine, fontWeight: "800" },
  message: { color: palette.pine, fontSize: 13, lineHeight: 19, marginTop: 14 },
  footer: { flexDirection: "row", gap: 9, marginTop: 24 },
});
