import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { FocusModal } from "@/components/planner/FocusModal";
import { TaskCard } from "@/components/planner/TaskCard";
import { TaskEditor } from "@/components/planner/TaskEditor";
import { BrandLogo } from "@/components/planner/BrandLogo";
import { HomeMotivation } from "@/components/planner/HomeMotivation";
import { palette, PrimaryButton, ProgressBar, ProgressRing, SectionTitle, Surface } from "@/components/planner/PlannerUI";
import { usePlanner } from "@/lib/planner/PlannerProvider";
import { resolveTimerFocusAction } from "@/lib/planner/timer-actions";
import { useAuth } from "@/lib/_core/AuthProvider";
import { dateLabel } from "@/lib/planner/scheduling";
import type { PlannerTask } from "@/lib/planner/types";

export default function DayScreen() {
  const { user } = useAuth();
  const { tasks, ready, saveTasks, removeTask, toggleCompleted, moveTask, startTimer, timer, toggleTimer, stopTimer, remainingSeconds } = usePlanner();
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<PlannerTask | null>(null);
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const doneCount = tasks.filter((task) => task.completedAt).length;
  const progress = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
  const movableTasks = tasks.filter((task) => !task.completedAt && !task.timeConstraint);
  const focusTask = useMemo(() => tasks.find((task) => task.id === focusTaskId) ?? tasks.find((task) => task.id === timer?.taskId), [tasks, focusTaskId, timer?.taskId]);
  const running = Boolean(timer?.endsAt && remainingSeconds > 0);
  const nextTask = useMemo(
    () => tasks.find((task) => task.id === timer?.taskId && !task.completedAt) ?? tasks.find((task) => !task.completedAt) ?? null,
    [tasks, timer?.taskId],
  );
  const timerFocusState = nextTask && timer?.taskId === nextTask.id
    ? remainingSeconds === 0 ? "expired" : timer.endsAt === null ? "paused" : "running"
    : null;

  const openNew = () => { setEditingTask(null); setEditorVisible(true); };
  const openEdit = (task: PlannerTask) => { setEditingTask(task); setEditorVisible(true); };

  if (!ready) {
    return <SafeAreaView style={styles.safe}><View style={styles.loading}><ActivityIndicator color={palette.pine} /><Text style={styles.muted}>Planın hazırlanıyor…</Text></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <View style={styles.brandRow}>
            <View style={styles.brandLeft}><View style={styles.brandTile}><BrandLogo size={34} label="Ritminde logosu" /></View><View><Text style={styles.wordmark}>Ritminde</Text><Text style={styles.wordmarkSub}>KENDİ RİTMİNDE</Text></View></View>
            <View style={styles.datePill}><View style={styles.dateDot} /><Text style={styles.datePillText}>{dateLabel().toLocaleUpperCase("tr-TR")}</Text></View>
          </View>

          <View style={styles.hero}>
            <View style={styles.heroTop}>
              <View style={styles.heroCopy}>
                <Text style={styles.eyebrow}>BUGÜNÜN RİTMİ</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} style={styles.greeting}>{user?.name?.trim() ? `Merhaba, ${user.name.trim().split(/\s+/)[0]}!` : "Merhaba!"}</Text>
                <Text style={styles.headline}>Bugün kendi ritminde ilerle.</Text>
                <Text style={styles.heroNote}>
                  {tasks.length === 0
                    ? "Hazır olduğunda tek bir küçük adımla başlayabilirsin."
                    : doneCount === tasks.length
                      ? "Bugünlük planın tamam. Kendine de zaman bırak."
                      : doneCount > 0
                        ? `${doneCount} küçük adım tamamlandı. Kalanı kendi ritminde.`
                        : "Bugün bir adım bile yeter."}
                </Text>
              </View>
              <ProgressRing
                value={progress}
                size={78}
                label={tasks.length ? `Bugünün görevlerinin yüzde ${progress} kadarı tamamlandı` : "İlk adımını eklediğinde günlük ilerlemen burada görünür"}
                centerText={tasks.length ? undefined : "—"}
                trackColor="rgba(255,253,247,0.20)"
                progressColor={palette.coral}
                textColor="#FFFDF7"
              />
            </View>
            {tasks.length > 0 ? (
              <View style={styles.progressMeta}>
                <View style={styles.metaTop}>
                  <Text style={styles.metaStrong}>{doneCount} / {tasks.length}</Text>
                  <Text style={styles.metaCaption}>adım tamamlandı</Text>
                </View>
                <ProgressBar value={progress} height={6} color={palette.coral} trackColor="#557365" label={`Günlük planın tamamlanması yüzde ${progress}`} />
              </View>
            ) : null}
          </View>

          {timer ? (
            <Pressable onPress={() => setFocusTaskId(timer.taskId)} accessibilityRole="button" accessibilityLabel="Devam eden odak zamanlayıcısına dön" style={styles.timerBanner}>
              <View style={styles.timerDot} /><View style={{ flex: 1 }}><Text style={styles.timerBannerTitle}>Odak zamanı {running ? "sürüyor" : "duraklatıldı"}</Text><Text style={styles.timerBannerBody}>{focusTask?.title ?? "Görevin"} · {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, "0")}</Text></View><Text style={styles.timerChevron}>→</Text>
            </Pressable>
          ) : null}

          <HomeMotivation
            completedCount={doneCount}
            totalCount={tasks.length}
            nextTask={nextTask}
            timerState={timerFocusState}
            onFocus={() => {
              if (!nextTask) return;
              const action = resolveTimerFocusAction(nextTask.id, timer, Date.now());
              if (action === "resume") toggleTimer();
              else if (action === "start" || action === "restart") startTimer(nextTask.id);
              setFocusTaskId(nextTask.id);
            }}
          />

          <View style={styles.sectionBlock}>
            <SectionTitle title="Gün akışı" detail="Sabit saatlerin korunur; diğer adımlar uygun boşluklara yerleşir." action={tasks.length ? <Text style={styles.countPill}>{tasks.length} adım</Text> : undefined} />
            {tasks.length === 0 ? (
              <Surface style={styles.emptyCard}>
                <View style={styles.emptyMark}><BrandLogo size={35} /></View>
                <Text style={styles.emptyTitle}>Planın sana ait.</Text>
                <Text style={styles.emptyBody}>İşlerini yaz ya da söyle. Saat verdiğin adımlar sabit kalır, diğerleri uygun boşluklara yerleşir.</Text>
                <PrimaryButton title="İlk adımı ekle" icon="＋" onPress={openNew} style={{ alignSelf: "stretch", marginTop: 16 }} />
              </Surface>
            ) : (
              <View>
                {tasks.map((task, index) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    focused={timer?.taskId === task.id && running}
                    index={index}
                    total={tasks.length}
                    moveUpDisabled={task.completedAt !== undefined || Boolean(task.timeConstraint) || movableTasks.findIndex((item) => item.id === task.id) <= 0}
                    moveDownDisabled={task.completedAt !== undefined || Boolean(task.timeConstraint) || movableTasks.findIndex((item) => item.id === task.id) === movableTasks.length - 1}
                    onToggle={() => { toggleCompleted(task.id); setNote(task.completedAt ? "Görev tekrar plana alındı." : "Bir adım tamamlandı. Devamı kendi hızında."); setTimeout(() => setNote(""), 2800); }}
                    onTimer={() => { if (timer?.taskId !== task.id) startTimer(task.id); setFocusTaskId(task.id); }}
                    onEdit={() => openEdit(task)}
                    onMove={(delta) => moveTask(task.id, delta)}
                    onRemove={() => { if (timer?.taskId === task.id) stopTimer(); removeTask(task.id); setNote("Görev plandan kaldırıldı."); setTimeout(() => setNote(""), 2400); }}
                  />
                ))}
              </View>
            )}
            {note ? <Text accessibilityLiveRegion="polite" style={styles.toast}>{note}</Text> : null}
          </View>

          <View style={styles.bottomActions}>
            <PrimaryButton title="Yeni görev ekle" icon="＋" onPress={openNew} style={{ flex: 1 }} />
            <Pressable onPress={openNew} accessibilityRole="button" accessibilityLabel="Sesle görev ekle" style={styles.micButton}><Text style={styles.micGlyph}>◖</Text><Text style={styles.micText}>Sesle</Text></Pressable>
          </View>
          <Text style={styles.footerText}>Planın değişebilir. Bugün, yeniden başlayabileceğin bir gün.</Text>
        </View>
      </ScrollView>

      {editorVisible ? <TaskEditor visible task={editingTask} onClose={() => setEditorVisible(false)} onSave={saveTasks} /> : null}
      <FocusModal
        visible={Boolean(focusTaskId && focusTask)}
        task={focusTask}
        remainingSeconds={remainingSeconds}
        running={running}
        onClose={() => setFocusTaskId(null)}
        onToggle={toggleTimer}
        onRestart={() => focusTask && startTimer(focusTask.id)}
        onComplete={() => { if (focusTask && !focusTask.completedAt) toggleCompleted(focusTask.id); setFocusTaskId(null); }}
        onStop={() => { stopTimer(); setFocusTaskId(null); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.canvas },
  content: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 28, flexGrow: 1 },
  container: { width: "100%", maxWidth: 620, alignSelf: "center" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  muted: { color: palette.muted, fontSize: 14 },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  brandLeft: { flexDirection: "row", alignItems: "center", gap: 9 },
  brandTile: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: palette.pale },
  wordmark: { color: palette.pine, fontSize: 17, fontWeight: "800", letterSpacing: -0.5 },
  wordmarkSub: { color: palette.muted, fontSize: 8, fontWeight: "800", letterSpacing: 1.55, marginTop: 1 },
  datePill: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: palette.line, paddingHorizontal: 10, minHeight: 31, borderRadius: 20, maxWidth: "56%" },
  dateDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.coral },
  datePillText: { color: palette.moss, fontSize: 9, letterSpacing: 0.5, fontWeight: "800" },
  hero: { borderRadius: 26, backgroundColor: palette.pine, padding: 20, gap: 15, overflow: "hidden", borderWidth: 1, borderColor: "#3A6352", shadowColor: palette.pine, shadowOpacity: 0.12, shadowOffset: { width: 0, height: 8 }, shadowRadius: 16, elevation: 2 },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: "#C2D2C7", fontSize: 9, letterSpacing: 1.5, fontWeight: "800", marginBottom: 8 },
  greeting: { color: "#FFFDF7", fontSize: 22, fontWeight: "700", lineHeight: 27 },
  headline: { color: "#FFFDF7", fontSize: 17, lineHeight: 22, fontWeight: "700", letterSpacing: -0.3 },
  heroNote: { color: "#D6E1D8", fontSize: 12, lineHeight: 17, marginTop: 7 },
  progressMeta: { gap: 7 },
  metaTop: { flexDirection: "row", gap: 7, alignItems: "baseline" },
  metaStrong: { color: "#FFFDF7", fontSize: 11, fontWeight: "800" },
  metaCaption: { color: "#C2D2C7", fontSize: 10 },
  timerBanner: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, backgroundColor: "#F7E8DC", borderWidth: 1, borderColor: "#ECD3C4", padding: 14, marginTop: 14 },
  timerDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: palette.coral },
  timerBannerTitle: { color: palette.ink, fontSize: 13, fontWeight: "700" },
  timerBannerBody: { color: palette.moss, fontSize: 12, marginTop: 3 },
  timerChevron: { color: palette.pine, fontSize: 21 },
  sectionBlock: { marginTop: 26 },
  countPill: { color: palette.moss, backgroundColor: palette.soft, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 6, fontSize: 11, fontWeight: "700" },
  emptyCard: { alignItems: "flex-start", padding: 20 },
  emptyMark: { width: 55, height: 55, borderRadius: 19, backgroundColor: palette.pale, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptyTitle: { color: palette.ink, fontSize: 20, fontWeight: "700" },
  emptyBody: { color: palette.muted, fontSize: 14, lineHeight: 21, marginTop: 6 },
  toast: { color: palette.pine, backgroundColor: palette.pale, borderRadius: 13, padding: 11, marginBottom: 9, fontSize: 13, fontWeight: "600" },
  bottomActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  micButton: { minWidth: 88, minHeight: 52, paddingHorizontal: 14, borderRadius: 17, backgroundColor: palette.paper, borderColor: palette.line, borderWidth: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 7 },
  micGlyph: { color: palette.pine, fontSize: 18, fontWeight: "700" },
  micText: { color: palette.pine, fontSize: 14, fontWeight: "700" },
  footerText: { color: palette.muted, fontSize: 11, textAlign: "center", lineHeight: 17, marginTop: 17 },
});
