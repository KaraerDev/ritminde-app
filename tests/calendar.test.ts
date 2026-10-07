import { describe, expect, it } from "vitest";
import { calendarMonthCells, eventReminderTriggerDate, isValidCalendarTime, localDateFromKey, localDateKey, localEventDate } from "../lib/planner/calendar";
import { rollPlannerStateToDay } from "../lib/planner/state";
import type { PlannerState } from "../lib/planner/types";

describe("Takvim tarih ve saat yardımcıları", () => {
  it("tarih anahtarlarını UTC kaymasına uğramadan cihazın yerel gününde tutar", () => {
    const date = new Date(2026, 9, 7, 0, 15);
    expect(localDateKey(date)).toBe("2026-10-07");
    expect(localDateFromKey("2026-10-07")?.getDate()).toBe(7);
    expect(localDateFromKey("2026-02-30")).toBeNull();
  });

  it("tarih ve saati yerel olarak üretir, geçersiz saatleri reddeder", () => {
    const eventDate = localEventDate("2026-10-07", "09:30");
    expect(eventDate?.getHours()).toBe(9);
    expect(eventDate?.getMinutes()).toBe(30);
    expect(localEventDate("2026-10-07", "25:00")).toBeNull();
    expect(isValidCalendarTime("23:59")).toBe(true);
    expect(isValidCalendarTime("9:30")).toBe(false);
  });

  it("yaz saati geçişinde var olmayan yerel saati reddeder", () => {
    const previousZone = process.env.TZ;
    try {
      process.env.TZ = "America/New_York";
      expect(localEventDate("2026-03-08", "02:30")).toBeNull();
      expect(localEventDate("2026-03-08", "03:30")?.getHours()).toBe(3);
    } finally {
      if (previousZone === undefined) delete process.env.TZ;
      else process.env.TZ = previousZone;
    }
  });

  it("hafta başı pazartesi olan aylık ızgarayı doğru doldurur", () => {
    const october = calendarMonthCells(2026, 9);
    expect(october.slice(0, 3)).toEqual([null, null, null]);
    expect(october[3]).toBe(1);
    expect(october.filter((day) => day !== null).at(-1)).toBe(31);
    expect(october.length % 7).toBe(0);
  });

  it("etkinlik saatinde veya seçilen dakika aralığından önce hatırlatıcı kurar", () => {
    const now = new Date(2026, 9, 7, 10, 0).getTime();
    expect(eventReminderTriggerDate("2026-10-07", "11:00", 10, now)?.getTime()).toBe(new Date(2026, 9, 7, 10, 50).getTime());
    expect(eventReminderTriggerDate("2026-10-07", "11:00", 0, now)?.getHours()).toBe(11);
    expect(eventReminderTriggerDate("2026-10-07", "11:00", 1440, now)).toBeNull();
    expect(eventReminderTriggerDate("2026-10-07", "09:30", 0, now)).toBeNull();
  });

  it("yeni güne geçince günlük görevleri yeniler ama hesap takvimindeki gelecek planları korur", () => {
    const calendarEvent = {
      id: "future-plan",
      title: "Sınav",
      dateKey: "2026-10-10",
      time: "11:00",
      durationMinutes: 60,
      reminderEnabled: true,
      reminderOffsetMinutes: 10 as const,
      createdAt: "2026-10-07T08:00:00.000Z",
      updatedAt: "2026-10-07T08:00:00.000Z",
    };
    const state: PlannerState = {
      dayKey: "2026-10-07",
      tasks: [{ id: "today-task", title: "Bugünkü görev", durationMinutes: 25, priority: "normal", reminder: false, createdAt: "2026-10-07T08:00:00.000Z" }],
      completions: [],
      timer: { taskId: "today-task", endsAt: null, remainingMs: 30_000 },
      preferences: { remindersEnabled: false, gentleSound: true, dailyReminderLimit: 2 },
      calendarEvents: [calendarEvent],
    };

    const nextDay = rollPlannerStateToDay(state, "2026-10-08");
    expect(nextDay.tasks).toEqual([]);
    expect(nextDay.timer).toBeNull();
    expect(nextDay.calendarEvents).toEqual([calendarEvent]);
  });
});
