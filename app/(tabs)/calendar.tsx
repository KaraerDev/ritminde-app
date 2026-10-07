import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { BrandLogo } from "@/components/planner/BrandLogo";
import { CalendarEventEditor } from "@/components/planner/CalendarEventEditor";
import { CalendarMonth } from "@/components/planner/CalendarMonth";
import { ActivityGlyph } from "@/components/planner/ActivityGlyph";
import { SectionTitle, Surface, palette } from "@/components/planner/PlannerUI";
import { usePlanner } from "@/lib/planner/PlannerProvider";
import type { PlannerCalendarEvent } from "@/lib/planner/types";
import { calendarDateLabel, localDateKey, localDateFromKey, reminderChoices, shiftCalendarMonth } from "@/lib/planner/calendar";

export default function CalendarScreen() {
  const { calendarEvents, ready, saveCalendarEvent, removeCalendarEvent } = usePlanner();
  const todayKey = localDateKey();
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PlannerCalendarEvent | null>(null);
  const [message, setMessage] = useState("");

  const eventDateKeys = useMemo(() => new Set(calendarEvents.map((event) => event.dateKey)), [calendarEvents]);
  const selectedEvents = useMemo(
    () => calendarEvents.filter((event) => event.dateKey === selectedDateKey).sort((a, b) => a.time.localeCompare(b.time)),
    [calendarEvents, selectedDateKey],
  );

  const openNewEvent = () => {
    setEditingEvent(null);
    setMessage("");
    setEditorVisible(true);
  };
  const openEditEvent = (event: PlannerCalendarEvent) => {
    setEditingEvent(event);
    setMessage("");
    setEditorVisible(true);
  };
  const changeMonth = (offset: number) => {
    const next = shiftCalendarMonth(month, offset);
    const currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    if (next.getTime() < currentMonth.getTime()) return;
    setMonth(next);
    const selected = localDateFromKey(selectedDateKey);
    if (!selected || selected.getFullYear() !== next.getFullYear() || selected.getMonth() !== next.getMonth()) {
      const nextIsCurrent = next.getFullYear() === currentMonth.getFullYear() && next.getMonth() === currentMonth.getMonth();
      setSelectedDateKey(nextIsCurrent ? todayKey : localDateKey(new Date(next.getFullYear(), next.getMonth(), 1, 12)));
    }
    setMessage("");
  };
  const showToday = () => {
    const today = new Date();
    setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDateKey(localDateKey(today));
    setMessage("");
  };
  const handleSave = async (draft: Parameters<typeof saveCalendarEvent>[0], editId?: string) => {
    const result = await saveCalendarEvent(draft, editId);
    setMessage(result.reminderScheduled
      ? "Plan kaydedildi; seçtiğin zamanda cihazına nazik bir hatırlatıcı gelecek."
      : result.reminderSkipped
        ? "Plan kaydedildi; seçilen hatırlatma zamanı geçmiş olduğundan bildirim kurulmadı."
        : result.reminderUnavailable
          ? "Plan kaydedildi; bu cihazda bildirim izni yok veya bildirimler desteklenmiyor. Takvim kaydın korunuyor."
          : "Plan takvimine kaydedildi.");
    return result;
  };
  const deleteEvent = (event: PlannerCalendarEvent) => {
    removeCalendarEvent(event.id);
    setMessage("Plan takvimden kaldırıldı.");
  };
  const requestDelete = (event: PlannerCalendarEvent) => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm(`“${event.title}” planını takvimden silmek istiyor musun?`)) deleteEvent(event);
      return;
    }
    Alert.alert("Planı takvimden sil?", `“${event.title}” planı kaldırılacak.`, [
      { text: "Vazgeç", style: "cancel" },
      { text: "Sil", style: "destructive", onPress: () => deleteEvent(event) },
    ]);
  };

  if (!ready) {
    return <SafeAreaView style={styles.safe}><View style={styles.loading}><ActivityIndicator color={palette.pine} /><Text style={styles.muted}>Takvimin hazırlanıyor…</Text></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <View style={styles.brandRow}>
            <View style={styles.brandLeft}>
              <View style={styles.brandTile}><BrandLogo size={32} label="Ritminde logosu" /></View>
              <View><Text style={styles.wordmark}>Ritminde</Text><Text style={styles.wordmarkSub}>GELECEK PLANIN</Text></View>
            </View>
            <Pressable onPress={showToday} accessibilityRole="button" accessibilityLabel="Bugünün takvim planlarına git" style={styles.todayButton}>
              <Text style={styles.todayButtonText}>Bugün</Text>
            </Pressable>
          </View>

          <Text accessibilityRole="header" style={styles.title}>Takvimine alan aç.</Text>
          <Text style={styles.subtitle}>Gelecek planlarını seçtiğin günde sakla; hatırlatıcıyı istersen aç.</Text>

          <View style={styles.calendarWrap}>
            <CalendarMonth
              month={month}
              todayKey={todayKey}
              selectedDateKey={selectedDateKey}
              eventDateKeys={eventDateKeys}
              onMonthChange={changeMonth}
              onSelectDate={(dateKey) => { setSelectedDateKey(dateKey); setMessage(""); }}
            />
          </View>

          <View style={styles.planSection}>
            <SectionTitle
              title={calendarDateLabel(selectedDateKey)}
              detail={selectedEvents.length ? `${selectedEvents.length} plan` : "Seçtiğin güne ait planların"}
              action={
                <Pressable onPress={openNewEvent} accessibilityRole="button" accessibilityLabel={`${calendarDateLabel(selectedDateKey)} için yeni plan ekle`} style={styles.addButton}>
                  <Text style={styles.addButtonText}>＋</Text>
                </Pressable>
              }
            />

            {selectedEvents.length ? selectedEvents.map((event) => {
              const reminderLabel = reminderChoices.find((choice) => choice.offset === event.reminderOffsetMinutes)?.label ?? "Hatırlatma";
              const reminderText = !event.reminderEnabled
                ? "Hatırlatma kapalı"
                : event.notificationId
                  ? `Cihaz bildirimi · ${reminderLabel.toLocaleLowerCase("tr-TR")}`
                  : `Bildirim kurulmadı · ${reminderLabel.toLocaleLowerCase("tr-TR")}`;
              return (
                <Surface key={event.id} style={styles.eventCard}>
                  <View style={styles.eventTop}>
                    <ActivityGlyph title={event.title} size={42} />
                    <View style={styles.eventCopy}>
                      <Text style={styles.eventTime}>{event.time}<Text style={styles.eventDuration}> · {event.durationMinutes} dk</Text></Text>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      <Text style={styles.eventReminder}>{reminderText}</Text>
                    </View>
                  </View>
                  <View style={styles.eventActions}>
                    <Pressable onPress={() => openEditEvent(event)} accessibilityRole="button" accessibilityLabel={`${event.title} planını düzenle`} style={styles.eventAction}>
                      <Text style={styles.eventActionText}>Düzenle</Text>
                    </Pressable>
                    <Pressable onPress={() => requestDelete(event)} accessibilityRole="button" accessibilityLabel={`${event.title} planını sil`} style={[styles.eventAction, styles.deleteAction]}>
                      <Text style={[styles.eventActionText, styles.deleteText]}>Sil</Text>
                    </Pressable>
                  </View>
                </Surface>
              );
            }) : (
              <Surface style={styles.emptyCard}>
                <View style={styles.emptyMark}><BrandLogo size={30} /></View>
                <Text style={styles.emptyTitle}>Bu gün için plan yok.</Text>
                <Text style={styles.emptyBody}>İstersen bir tarih seçip gelecekteki planını ve hatırlatıcını buraya ekleyebilirsin.</Text>
                <Pressable onPress={openNewEvent} accessibilityRole="button" accessibilityLabel={`${calendarDateLabel(selectedDateKey)} için plan ekle`} style={styles.emptyAddButton}>
                  <Text style={styles.emptyAddText}>Bu güne plan ekle</Text>
                </Pressable>
              </Surface>
            )}
          </View>

          {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}
          <Text style={styles.footnote}>Takvim planları günlük listen sıfırlansa da bu hesapta saklanır. Cihaz bildirimleri iOS veya Android uygulamasında çalışır.</Text>
        </View>
      </ScrollView>

      {editorVisible ? (
        <CalendarEventEditor
          visible={editorVisible}
          dateKey={selectedDateKey}
          event={editingEvent}
          onClose={() => setEditorVisible(false)}
          onSave={handleSave}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.canvas },
  content: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 30, flexGrow: 1 },
  container: { width: "100%", maxWidth: 620, alignSelf: "center" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  muted: { color: palette.muted, fontSize: 14 },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 17 },
  brandLeft: { flexDirection: "row", alignItems: "center", gap: 9 },
  brandTile: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: palette.pale },
  wordmark: { color: palette.pine, fontSize: 17, fontWeight: "800", letterSpacing: -0.5 },
  wordmarkSub: { color: palette.muted, fontSize: 8, fontWeight: "800", letterSpacing: 1.4, marginTop: 1 },
  todayButton: { minWidth: 65, minHeight: 44, justifyContent: "center", alignItems: "center", borderRadius: 15, backgroundColor: palette.pale, paddingHorizontal: 13 },
  todayButtonText: { color: palette.pine, fontSize: 13, fontWeight: "700" },
  title: { color: palette.ink, fontSize: 28, lineHeight: 34, fontWeight: "700", letterSpacing: -0.7 },
  subtitle: { color: palette.muted, fontSize: 14, lineHeight: 20, marginTop: 6 },
  calendarWrap: { marginTop: 20 },
  planSection: { marginTop: 27 },
  addButton: { minWidth: 44, minHeight: 44, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: palette.pine },
  addButtonText: { color: palette.white, fontSize: 24, lineHeight: 28, fontWeight: "400" },
  eventCard: { padding: 14, marginBottom: 10 },
  eventTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  eventCopy: { flex: 1, minWidth: 0 },
  eventTime: { color: palette.pine, fontSize: 13, fontWeight: "800", fontVariant: ["tabular-nums"] },
  eventDuration: { color: palette.muted, fontSize: 11, fontWeight: "500" },
  eventTitle: { color: palette.ink, fontSize: 15, lineHeight: 20, fontWeight: "700", marginTop: 3 },
  eventReminder: { color: palette.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  eventActions: { flexDirection: "row", gap: 8, justifyContent: "flex-end", borderTopWidth: 1, borderTopColor: palette.line, marginTop: 12, paddingTop: 8 },
  eventAction: { minWidth: 76, minHeight: 44, borderRadius: 13, alignItems: "center", justifyContent: "center", paddingHorizontal: 12, backgroundColor: palette.pale },
  eventActionText: { color: palette.pine, fontSize: 12, fontWeight: "700" },
  deleteAction: { backgroundColor: "#F8ECE7" },
  deleteText: { color: "#9B4838" },
  emptyCard: { alignItems: "flex-start", padding: 18 },
  emptyMark: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: palette.pale, marginBottom: 12 },
  emptyTitle: { color: palette.ink, fontSize: 17, fontWeight: "700" },
  emptyBody: { color: palette.muted, fontSize: 13, lineHeight: 19, marginTop: 5 },
  emptyAddButton: { minHeight: 46, alignSelf: "stretch", alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: palette.pine, marginTop: 13 },
  emptyAddText: { color: palette.white, fontSize: 14, fontWeight: "700" },
  message: { color: palette.pine, backgroundColor: palette.pale, borderRadius: 13, padding: 12, marginTop: 12, fontSize: 12, lineHeight: 18 },
  footnote: { color: palette.muted, fontSize: 11, lineHeight: 17, textAlign: "center", marginTop: 16 },
});
