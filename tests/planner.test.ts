import { describe, expect, it } from "vitest";
import { buildSchedule, formatDuration, mergeTaskOrder, prioritizeTasks, todayKey } from "../lib/planner/scheduling";
import type { PlannerTask } from "../lib/planner/types";
import { parsePlannerInput, splitVoiceTasks } from "../lib/planner/voice-tasks";
import { recordingContentType } from "../lib/planner/audio-utils";
import { resolveTimerFocusAction } from "../lib/planner/timer-actions";

const sampleTask = (id: string, priority: PlannerTask["priority"], values: Partial<PlannerTask> = {}): PlannerTask => ({
  id,
  title: id,
  durationMinutes: 25,
  priority,
  reminder: false,
  createdAt: `2026-10-06T09:00:0${id.length}.000Z`,
  ...values,
});

describe("Gün Akışı planlama yardımcıları", () => {
  it("sabit saatleri koruyup saatsiz işleri sabit etkinliklerden önceki boşluğa yerleştirir", () => {
    const tasks = [
      sampleTask("esnek", "gentle"),
      sampleTask("önemli", "high"),
      sampleTask("sabit-öğlen", "normal", { timeConstraint: "12:00" }),
      sampleTask("sabit-sabah", "normal", { timeConstraint: "09:00" }),
    ];
    expect(prioritizeTasks(tasks).map((task) => task.id)).toEqual(["sabit-sabah", "sabit-öğlen", "önemli", "esnek"]);
    expect(buildSchedule(tasks).map((task) => [task.id, task.plannedTime])).toEqual([
      ["önemli", "08:30"],
      ["sabit-sabah", "09:00"],
      ["esnek", "09:30"],
      ["sabit-öğlen", "12:00"],
    ]);
  });

  it("elle sıralı esnek işleri ve sabit etkinlik saatlerini birlikte korur", () => {
    const tasks = [
      sampleTask("esnek-ilk", "gentle", { sortOrder: 0, durationMinutes: 20 }),
      sampleTask("ders", "normal", { sortOrder: 1, durationMinutes: 45, timeConstraint: "09:30" }),
      sampleTask("önemli-sonra", "high", { sortOrder: 2, durationMinutes: 35 }),
      sampleTask("sınav", "normal", { sortOrder: 3, durationMinutes: 60, timeConstraint: "11:00" }),
    ];
    expect(buildSchedule(tasks).map((task) => [task.id, task.plannedTime])).toEqual([
      ["esnek-ilk", "08:30"],
      ["ders", "09:30"],
      ["önemli-sonra", "10:20"],
      ["sınav", "11:00"],
    ]);
  });

  it("çakışan iki sabit etkinliği de uyarı ile işaretler", () => {
    const tasks = [
      sampleTask("ders", "normal", { durationMinutes: 60, timeConstraint: "10:00" }),
      sampleTask("sınav", "normal", { durationMinutes: 30, timeConstraint: "10:30" }),
    ];
    expect(buildSchedule(tasks).map((task) => [task.id, task.scheduleConflict])).toEqual([
      ["ders", true],
      ["sınav", true],
    ]);
  });

  it("kullanıcının elle belirlediği esnek sıra otomatik önceliğe tercih eder", () => {
    const tasks = [sampleTask("esnek-ilk", "gentle", { sortOrder: 0, durationMinutes: 10 }), sampleTask("önemli-sonra", "high", { sortOrder: 1, durationMinutes: 20 })];
    expect(buildSchedule(tasks).map((task) => [task.id, task.plannedTime])).toEqual([["esnek-ilk", "08:30"], ["önemli-sonra", "08:45"]]);
  });

  it("aynı öncelikte daha kısa bir adımla başlamayı önerir", () => {
    const tasks = [sampleTask("uzun", "normal", { durationMinutes: 45 }), sampleTask("kısa", "normal", { durationMinutes: 10 })];
    expect(prioritizeTasks(tasks).map((task) => task.id)).toEqual(["kısa", "uzun"]);
  });

  it("görev düzenlemesinde elle seçilen sırayı korur ve yeni görevi araya yerleştirir", () => {
    const manual = [sampleTask("esnek-ilk", "gentle", { sortOrder: 0, durationMinutes: 10 }), sampleTask("önemli-sonra", "high", { sortOrder: 1, durationMinutes: 25 })];
    const edited = { ...manual[1], title: "Öncelikli işi güncelle", priority: "normal" as const };
    expect(mergeTaskOrder(manual, [edited], edited.id).map((task) => task.id)).toEqual(["esnek-ilk", "önemli-sonra"]);
    const addition = sampleTask("normal-ek", "normal", { durationMinutes: 20 });
    expect(mergeTaskOrder(manual, [addition]).map((task) => task.id)).toEqual(["normal-ek", "esnek-ilk", "önemli-sonra"]);
  });

  it("Türkçe doğal girdide 9.30da ve 11 de ifadelerini ayrı görev saatlerine bağlar", () => {
    expect(parsePlannerInput("Bugün 9.30da dersim var daha sonrasında 11 de sınava gireceğim")).toEqual([
      { title: "dersim", timeConstraint: "09:30" },
      { title: "sınava gireceğim", timeConstraint: "11:00" },
    ]);
  });

  it("aynı cümledeki birden çok saate göre görevleri ayırır ve saatleri sabit tutar", () => {
    expect(parsePlannerInput("Bugün 09:30 dersim var ve 11:00 sınavım var")).toEqual([
      { title: "dersim", timeConstraint: "09:30" },
      { title: "sınavım", timeConstraint: "11:00" },
    ]);
  });

  it("İngilizce bağlaçla aynı girdide verilen iki saati de doğru göreve bağlar", () => {
    expect(parsePlannerInput("09:30 lecture and 11:00 exam")).toEqual([
      { title: "lecture", timeConstraint: "09:30" },
      { title: "exam", timeConstraint: "11:00" },
    ]);
  });

  it("odak widgetı sayaç durumuna göre başlatma, açma, sürdürme ve yenileme seçer", () => {
    const now = 1_000_000;
    expect(resolveTimerFocusAction("ders", null, now)).toBe("start");
    expect(resolveTimerFocusAction("ders", { taskId: "ders", endsAt: now + 30_000, remainingMs: 60_000 }, now)).toBe("open");
    expect(resolveTimerFocusAction("ders", { taskId: "ders", endsAt: null, remainingMs: 30_000 }, now)).toBe("resume");
    expect(resolveTimerFocusAction("ders", { taskId: "ders", endsAt: now - 1, remainingMs: 30_000 }, now)).toBe("restart");
    expect(resolveTimerFocusAction("ders", { taskId: "yürüyüş", endsAt: null, remainingMs: 30_000 }, now)).toBe("start");
  });

  it("numaralı listeleri ve noktalı virgülle ayrılmış serbest görevleri ayırır", () => {
    expect(splitVoiceTasks("1. Raporu bitir. • Kısa bir yürüyüş yap; su iç")).toEqual(["Raporu bitir", "Kısa bir yürüyüş yap", "su iç"]);
    expect(splitVoiceTasks(Array.from({ length: 10 }, (_, index) => `İş ${index + 1}`).join("\n"))).toHaveLength(8);
  });

  it("kaydedici platformuna uygun ve sunucunun kabul ettiği audio biçimini seçer", () => {
    expect(recordingContentType("android")).toBe("audio/m4a");
    expect(recordingContentType("ios")).toBe("audio/m4a");
    expect(recordingContentType("web")).toBe("audio/webm");
  });

  it("gün anahtarı ve süre etiketleri yerel, okunabilir biçimdedir", () => {
    expect(todayKey(new Date(2026, 0, 2))).toBe("2026-01-02");
    expect(formatDuration(60)).toBe("1 sa");
    expect(formatDuration(75)).toBe("1 sa 15 dk");
  });
});
