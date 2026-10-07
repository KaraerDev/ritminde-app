import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import { buildSchedule, mergeTaskOrder, todayKey } from "./scheduling";
import type { ScheduledTask } from "./scheduling";
import { eventReminderTriggerDate, localEventDate } from "./calendar";
import { rollPlannerStateToDay } from "./state";
import { cancelReminder, scheduleCalendarReminder, scheduleTaskReminder, scheduleTimerFinished } from "./notifications";
import type { CalendarEventDraft, CompletionEntry, PlannerCalendarEvent, PlannerPreferences, PlannerState, PlannerTask, PlannerTimer, Priority } from "./types";
import { useAuth } from "../_core/AuthProvider";

const STORAGE_KEY = "gun-akisi-planner-v1";

export type TaskDraft = {
  title: string;
  durationMinutes: number;
  priority: Priority;
  timeConstraint?: string;
  reminder: boolean;
};

export type CalendarSaveResult = {
  id: string;
  reminderScheduled: boolean;
  reminderSkipped: boolean;
  reminderUnavailable: boolean;
};

type PlannerContextValue = {
  tasks: ScheduledTask[];
  completions: CompletionEntry[];
  calendarEvents: PlannerCalendarEvent[];
  preferences: PlannerPreferences;
  timer: PlannerTimer | null;
  now: number;
  ready: boolean;
  saveTasks: (drafts: TaskDraft[], editId?: string) => Promise<void>;
  saveCalendarEvent: (draft: CalendarEventDraft, editId?: string) => Promise<CalendarSaveResult>;
  removeCalendarEvent: (id: string) => void;
  removeTask: (id: string) => void;
  toggleCompleted: (id: string) => void;
  moveTask: (id: string, delta: number) => void;
  startTimer: (id: string) => void;
  toggleTimer: () => void;
  stopTimer: () => void;
  updatePreferences: (patch: Partial<PlannerPreferences>) => Promise<void>;
  remainingSeconds: number;
  dayKey: string;
};

const PlannerContext = createContext<PlannerContextValue | null>(null);

function emptyState(): PlannerState {
  const now = new Date();
  const dayKey = todayKey(now);
  return {
    dayKey,
    tasks: [],
    completions: [],
    timer: null,
    preferences: { remindersEnabled: false, gentleSound: true, dailyReminderLimit: 2 },
    calendarEvents: [],
  };
}

function safeParse(value: string | null): PlannerState | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as PlannerState;
    if (!Array.isArray(parsed.tasks) || !Array.isArray(parsed.completions)) return null;
    const savedPreferences = parsed.preferences;
    const calendarEvents = Array.isArray(parsed.calendarEvents) ? parsed.calendarEvents : [];
    return {
      ...parsed,
      calendarEvents,
      preferences: {
        remindersEnabled: savedPreferences?.remindersEnabled ?? false,
        gentleSound: savedPreferences?.gentleSound ?? true,
        dailyReminderLimit: savedPreferences?.dailyReminderLimit ?? 2,
      },
    };
  } catch {
    return null;
  }
}

export function PlannerProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const openId = user?.openId ?? null;
  const accountStorageKey = openId ? `${STORAGE_KEY}:member:${encodeURIComponent(openId)}` : null;
  const [state, setState] = useState<PlannerState>(emptyState);
  const stateRef = useRef(state);
  const [readyOwner, setReadyOwner] = useState<string | null>(null);
  const ready = Boolean(openId && !authLoading && readyOwner === openId);
  const previousOwner = useRef<string | null>(null);
  const accountKeyRef = useRef(accountStorageKey);
  const taskReminderSyncGeneration = useRef(0);
  const [now, setNow] = useState(Date.now());
  const dayKey = todayKey(new Date(now));

  const commit = useCallback((next: PlannerState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  useLayoutEffect(() => {
    accountKeyRef.current = accountStorageKey;
    taskReminderSyncGeneration.current += 1;
  }, [accountStorageKey]);

  const syncTaskReminders = useCallback(async (ownerKey: string | null) => {
    if (!ownerKey || accountKeyRef.current !== ownerKey) return;
    const generation = ++taskReminderSyncGeneration.current;
    const notificationIds = stateRef.current.tasks.map((task) => task.notificationId).filter((id): id is string => Boolean(id));
    await Promise.all(notificationIds.map((id) => cancelReminder(id)));
    if (generation !== taskReminderSyncGeneration.current || accountKeyRef.current !== ownerKey) return;

    let latest = stateRef.current;
    const tasksWithoutNotifications = latest.tasks.map((task) => ({ ...task, notificationId: undefined }));
    if (latest.tasks.some((task) => task.notificationId)) {
      commit({ ...latest, tasks: tasksWithoutNotifications });
      latest = stateRef.current;
    }
    if (!latest.preferences.remindersEnabled) return;

    let scheduledCount = 0;
    for (const task of buildSchedule(latest.tasks)) {
      if (generation !== taskReminderSyncGeneration.current || accountKeyRef.current !== ownerKey) return;
      if (!task.reminder || task.completedAt || scheduledCount >= latest.preferences.dailyReminderLimit) continue;
      const notificationId = await scheduleTaskReminder(task.title, task.plannedTime, latest.preferences.gentleSound).catch(() => null);
      if (!notificationId) continue;
      latest = stateRef.current;
      const currentTask = latest.tasks.find((item) => item.id === task.id);
      const currentPlannedTime = buildSchedule(latest.tasks).find((item) => item.id === task.id)?.plannedTime;
      if (
        generation === taskReminderSyncGeneration.current &&
        accountKeyRef.current === ownerKey &&
        latest.preferences.remindersEnabled &&
        scheduledCount < latest.preferences.dailyReminderLimit &&
        currentTask?.reminder &&
        !currentTask.completedAt &&
        !currentTask.notificationId &&
        currentPlannedTime === task.plannedTime
      ) {
        commit({ ...latest, tasks: latest.tasks.map((item) => item.id === task.id ? { ...item, notificationId } : item) });
        scheduledCount += 1;
      } else {
        void cancelReminder(notificationId);
      }
    }
  }, [commit]);

  useEffect(() => {
    const previous = previousOwner.current;
    if (previous && previous !== openId) {
      const current = stateRef.current;
      const ids = [...current.tasks.map((task) => task.notificationId), current.timer?.notificationId, ...current.calendarEvents.map((event) => event.notificationId)].filter((id): id is string => Boolean(id));
      void Promise.all(ids.map((id) => cancelReminder(id)));
      if (readyOwner === previous) {
        const previousKey = `${STORAGE_KEY}:member:${encodeURIComponent(previous)}`;
        const withoutNotifications: PlannerState = {
          ...current,
          tasks: current.tasks.map((task) => ({ ...task, notificationId: undefined })),
          timer: current.timer ? { ...current.timer, notificationId: undefined } : null,
          calendarEvents: current.calendarEvents.map((event) => ({ ...event, notificationId: undefined })),
        };
        void AsyncStorage.setItem(previousKey, JSON.stringify(withoutNotifications)).catch(() => undefined);
      }
    }
    previousOwner.current = openId;
  }, [openId, readyOwner]);

  useEffect(() => {
    let active = true;
    if (authLoading) return () => { active = false; };
    if (!openId || !accountStorageKey) {
      const next = emptyState();
      stateRef.current = next;
      setState(next);
      setReadyOwner(null);
      return () => { active = false; };
    }

    const nextOwner = openId;
    const key = accountStorageKey;
    setReadyOwner(null);
    const blank = emptyState();
    stateRef.current = blank;
    setState(blank);
    AsyncStorage.getItem(key).then(async (stored) => {
      let saved = safeParse(stored);
      if (!saved && active) {
        const legacy = safeParse(await AsyncStorage.getItem(STORAGE_KEY));
        if (legacy && active) {
          saved = legacy;
          await AsyncStorage.setItem(key, JSON.stringify(legacy));
          await AsyncStorage.removeItem(STORAGE_KEY);
        }
      }
      if (!active) return;
      const currentDay = todayKey();
      const next = saved
        ? rollPlannerStateToDay(saved, currentDay)
        : emptyState();
      stateRef.current = next;
      setState(next);
      setReadyOwner(nextOwner);
    }).catch(() => {
      if (!active) return;
      const next = emptyState();
      stateRef.current = next;
      setState(next);
      setReadyOwner(nextOwner);
    });
    return () => { active = false; };
  }, [authLoading, openId, accountStorageKey]);

  useEffect(() => {
    if (!ready || !accountStorageKey) return;
    AsyncStorage.setItem(accountStorageKey, JSON.stringify(state)).catch(() => undefined);
  }, [ready, accountStorageKey, state]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const previous = stateRef.current;
    if (ready && previous.dayKey !== dayKey) {
      if (previous.timer?.notificationId) void cancelReminder(previous.timer.notificationId);
      void Promise.all(previous.tasks.map((task) => cancelReminder(task.notificationId)));
      commit({ ...previous, dayKey, tasks: [], timer: null });
    }
  }, [dayKey, ready, commit]);

  useEffect(() => {
    if (!ready || !accountStorageKey) return;
    let active = true;
    const ensureMemberReminders = async () => {
      await syncTaskReminders(accountStorageKey);
      if (!active || accountKeyRef.current !== accountStorageKey) return;

      for (const event of stateRef.current.calendarEvents) {
        if (!active) return;
        if (!event.reminderEnabled || event.notificationId) continue;
        const triggerDate = eventReminderTriggerDate(event.dateKey, event.time, event.reminderOffsetMinutes);
        if (!triggerDate) continue;
        const notificationId = await scheduleCalendarReminder(event.title, triggerDate, stateRef.current.preferences.gentleSound).catch(() => null);
        if (!notificationId) continue;
        if (!active || accountKeyRef.current !== accountStorageKey) {
          void cancelReminder(notificationId);
          continue;
        }
        const latest = stateRef.current;
        const currentEvent = latest.calendarEvents.find((item) => item.id === event.id);
        if (
          currentEvent?.reminderEnabled &&
          !currentEvent.notificationId &&
          currentEvent.title === event.title &&
          currentEvent.dateKey === event.dateKey &&
          currentEvent.time === event.time &&
          currentEvent.reminderOffsetMinutes === event.reminderOffsetMinutes
        ) {
          commit({ ...latest, calendarEvents: latest.calendarEvents.map((item) => item.id === event.id ? { ...item, notificationId } : item) });
        } else {
          void cancelReminder(notificationId);
        }
      }
    };
    void ensureMemberReminders();
    return () => { active = false; };
  }, [ready, accountStorageKey, commit, syncTaskReminders]);

  const saveTasks = useCallback(async (drafts: TaskDraft[], editId?: string) => {
    const ownerKey = accountStorageKey;
    if (!ready || !ownerKey || accountKeyRef.current !== ownerKey) throw new Error("Hesap oturumu değişti. Planını yeniden açıp tekrar dene.");
    const current = stateRef.current;
    const validDrafts = drafts.filter((draft) => draft.title.trim());
    if (!validDrafts.length) return;
    const replacing = editId ? current.tasks.find((task) => task.id === editId) : undefined;

    const created: PlannerTask[] = validDrafts.map((draft, index) => ({
      id: editId && index === 0 ? editId : `task-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
      title: draft.title.trim(),
      durationMinutes: Math.min(240, Math.max(5, draft.durationMinutes)),
      priority: draft.priority,
      timeConstraint: draft.timeConstraint?.trim() || undefined,
      reminder: draft.reminder,
      createdAt: editId && index === 0 ? replacing?.createdAt ?? new Date().toISOString() : new Date(Date.now() + index).toISOString(),
      completedAt: editId && index === 0 ? replacing?.completedAt : undefined,
    }));
    const nextTasks = mergeTaskOrder(current.tasks, created, editId);
    commit({ ...current, tasks: nextTasks });
    await syncTaskReminders(ownerKey);
    if (accountKeyRef.current !== ownerKey) throw new Error("Hesap oturumu değişti. Planını yeniden açıp tekrar dene.");
  }, [accountStorageKey, commit, ready, syncTaskReminders]);

  const saveCalendarEvent = useCallback(async (draft: CalendarEventDraft, editId?: string): Promise<CalendarSaveResult> => {
    const ownerKey = accountStorageKey;
    if (!ready || !ownerKey || accountKeyRef.current !== ownerKey) throw new Error("Hesap oturumu değişti. Takvimini yeniden açıp tekrar dene.");
    const title = draft.title.trim();
    const eventDate = localEventDate(draft.dateKey, draft.time);
    if (!title || !eventDate || eventDate.getTime() <= Date.now()) {
      throw new Error("Gelecek bir tarih ve geçerli bir saat seç.");
    }

    const previous = stateRef.current;
    const existing = editId ? previous.calendarEvents.find((event) => event.id === editId) : undefined;
    if (editId && !existing) throw new Error("Bu plan artık bulunamıyor. Takvimi yenileyip yeniden dene.");
    if (existing?.notificationId) await cancelReminder(existing.notificationId);
    if (accountKeyRef.current !== ownerKey) throw new Error("Hesap oturumu değişti. Takvimini yeniden açıp tekrar dene.");

    const id = existing?.id ?? `calendar-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const updatedAt = new Date().toISOString();
    const triggerDate = draft.reminderEnabled
      ? eventReminderTriggerDate(draft.dateKey, draft.time, draft.reminderOffsetMinutes)
      : null;
    const notificationId = triggerDate
      ? await scheduleCalendarReminder(title, triggerDate, previous.preferences.gentleSound).catch(() => null)
      : null;
    if (accountKeyRef.current !== ownerKey) {
      if (notificationId) void cancelReminder(notificationId);
      throw new Error("Hesap oturumu değişti. Takvimini yeniden açıp tekrar dene.");
    }
    const savedEvent: PlannerCalendarEvent = {
      ...draft,
      id,
      title,
      durationMinutes: Math.min(240, Math.max(5, draft.durationMinutes)),
      createdAt: existing?.createdAt ?? updatedAt,
      updatedAt,
      ...(notificationId ? { notificationId } : {}),
    };
    const latest = stateRef.current;
    const calendarEvents = existing
      ? latest.calendarEvents.map((event) => event.id === id ? savedEvent : event)
      : [...latest.calendarEvents, savedEvent];
    commit({ ...latest, calendarEvents });
    return {
      id,
      reminderScheduled: Boolean(notificationId),
      reminderSkipped: draft.reminderEnabled && !triggerDate,
      reminderUnavailable: draft.reminderEnabled && Boolean(triggerDate) && !notificationId,
    };
  }, [accountStorageKey, commit, ready]);

  const removeCalendarEvent = useCallback((id: string) => {
    if (!ready || !accountStorageKey || accountKeyRef.current !== accountStorageKey) return;
    const previous = stateRef.current;
    const event = previous.calendarEvents.find((item) => item.id === id);
    if (event?.notificationId) void cancelReminder(event.notificationId);
    commit({ ...previous, calendarEvents: previous.calendarEvents.filter((item) => item.id !== id) });
  }, [accountStorageKey, commit, ready]);

  const toggleCompleted = useCallback((id: string) => {
    if (!ready || !accountStorageKey || accountKeyRef.current !== accountStorageKey) return;
    const previous = stateRef.current;
    const task = previous.tasks.find((item) => item.id === id);
    if (!task) return;
    const completing = !task.completedAt;
    const completedAt = completing ? new Date().toISOString() : undefined;
    const scheduled = buildSchedule(previous.tasks).find((item) => item.id === id);
    const plannedAt = `${todayKey()}T${scheduled?.plannedTime ?? "23:59"}:00`;
    const entry: CompletionEntry = {
      taskId: id,
      date: todayKey(),
      completedAt: completedAt ?? new Date().toISOString(),
      plannedAt,
      onTime: new Date(completedAt ?? Date.now()).getTime() <= new Date(plannedAt).getTime() + 30 * 60_000,
    };
    if (completing && Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    if (task.notificationId) void cancelReminder(task.notificationId);
    if (previous.timer?.taskId === id && previous.timer.notificationId) void cancelReminder(previous.timer.notificationId);
    commit({
      ...previous,
      tasks: previous.tasks.map((item) => item.id === id ? { ...item, completedAt, notificationId: undefined } : item),
      completions: completing ? [...previous.completions, entry] : previous.completions.filter((item) => item.taskId !== id),
      timer: previous.timer?.taskId === id ? null : previous.timer,
    });
    void syncTaskReminders(accountStorageKey);
  }, [accountStorageKey, commit, ready, syncTaskReminders]);

  const removeTask = useCallback((id: string) => {
    if (!ready || !accountStorageKey || accountKeyRef.current !== accountStorageKey) return;
    const previous = stateRef.current;
    const task = previous.tasks.find((item) => item.id === id);
    if (task?.notificationId) void cancelReminder(task.notificationId);
    if (previous.timer?.taskId === id && previous.timer.notificationId) void cancelReminder(previous.timer.notificationId);
    commit({
      ...previous,
      tasks: previous.tasks.filter((item) => item.id !== id),
      completions: previous.completions.filter((item) => item.taskId !== id),
      timer: previous.timer?.taskId === id ? null : previous.timer,
    });
    void syncTaskReminders(accountStorageKey);
  }, [accountStorageKey, commit, ready, syncTaskReminders]);

  const moveTask = useCallback((id: string, delta: number) => {
    if (!ready || !accountStorageKey || accountKeyRef.current !== accountStorageKey) return;
    const previous = stateRef.current;
    const active = previous.tasks.filter((task) => !task.completedAt && !task.timeConstraint);
    const fixed = previous.tasks.filter((task) => !task.completedAt && Boolean(task.timeConstraint));
    const completed = previous.tasks.filter((task) => task.completedAt);
    const index = active.findIndex((task) => task.id === id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= active.length) return;
    [active[index], active[target]] = [active[target], active[index]];
    const reordered = [...completed, ...fixed, ...active].map((task, sortOrder) => ({ ...task, sortOrder }));
    commit({ ...previous, tasks: reordered });
    void syncTaskReminders(accountStorageKey);
  }, [accountStorageKey, commit, ready, syncTaskReminders]);

  const startTimer = useCallback((id: string) => {
    const ownerKey = accountStorageKey;
    if (!ready || !ownerKey || accountKeyRef.current !== ownerKey) return;
    const previous = stateRef.current;
    const task = previous.tasks.find((item) => item.id === id);
    if (!task || task.completedAt) return;
    if (previous.timer?.notificationId) void cancelReminder(previous.timer.notificationId);
    const seconds = task.durationMinutes * 60;
    const newTimer: PlannerTimer = { taskId: id, endsAt: Date.now() + seconds * 1000, remainingMs: seconds * 1000 };
    commit({ ...previous, timer: newTimer });
    void scheduleTimerFinished(task.title, seconds, previous.preferences.gentleSound).then((notificationId) => {
      if (!notificationId) return;
      if (accountKeyRef.current !== ownerKey) {
        void cancelReminder(notificationId);
        return;
      }
      const latest = stateRef.current;
      if (latest.timer?.taskId === id && latest.timer.endsAt) commit({ ...latest, timer: { ...latest.timer, notificationId } });
    }).catch(() => undefined);
  }, [accountStorageKey, commit, ready]);

  const toggleTimer = useCallback(() => {
    const ownerKey = accountStorageKey;
    if (!ready || !ownerKey || accountKeyRef.current !== ownerKey) return;
    const previous = stateRef.current;
    if (!previous.timer) return;
    if (previous.timer.endsAt) {
      const remainingMs = Math.max(0, previous.timer.endsAt - Date.now());
      if (previous.timer.notificationId) void cancelReminder(previous.timer.notificationId);
      commit({ ...previous, timer: { ...previous.timer, endsAt: null, remainingMs, notificationId: undefined } });
      return;
    }
    const seconds = Math.ceil(previous.timer.remainingMs / 1000);
    const task = previous.tasks.find((item) => item.id === previous.timer?.taskId);
    commit({ ...previous, timer: { ...previous.timer, endsAt: Date.now() + previous.timer.remainingMs } });
    if (task) {
      void scheduleTimerFinished(task.title, seconds, previous.preferences.gentleSound).then((notificationId) => {
        if (notificationId && accountKeyRef.current !== ownerKey) {
          void cancelReminder(notificationId);
          return;
        }
        const latest = stateRef.current;
        if (notificationId && latest.timer?.taskId === task.id && latest.timer.endsAt) commit({ ...latest, timer: { ...latest.timer, notificationId } });
      }).catch(() => undefined);
    }
  }, [accountStorageKey, commit, ready]);

  const stopTimer = useCallback(() => {
    if (!ready || !accountStorageKey || accountKeyRef.current !== accountStorageKey) return;
    const previous = stateRef.current;
    if (previous.timer?.notificationId) void cancelReminder(previous.timer.notificationId);
    commit({ ...previous, timer: null });
  }, [accountStorageKey, commit, ready]);

  const updatePreferences = useCallback(async (patch: Partial<PlannerPreferences>) => {
    const ownerKey = accountStorageKey;
    if (!ready || !ownerKey || accountKeyRef.current !== ownerKey) return;
    const previous = stateRef.current;
    const preferences = { ...previous.preferences, ...patch };
    const soundChanged = patch.gentleSound !== undefined && patch.gentleSound !== previous.preferences.gentleSound;
    const shouldRescheduleTimer = soundChanged && Boolean(previous.timer?.notificationId);
    if (soundChanged) {
      await Promise.all([
        ...(previous.timer?.notificationId ? [cancelReminder(previous.timer.notificationId)] : []),
        ...previous.calendarEvents.map((event) => cancelReminder(event.notificationId)),
      ]);
      if (accountKeyRef.current !== ownerKey) return;
    }

    const latest = stateRef.current;
    const timer = soundChanged && latest.timer ? { ...latest.timer, notificationId: undefined } : latest.timer;
    const calendarEvents = soundChanged
      ? latest.calendarEvents.map((event) => ({ ...event, notificationId: undefined }))
      : latest.calendarEvents;
    commit({ ...latest, preferences, timer, calendarEvents });
    await syncTaskReminders(ownerKey);
    if (accountKeyRef.current !== ownerKey) return;

    if (shouldRescheduleTimer) {
      const latestTimer = stateRef.current.timer;
      if (latestTimer?.endsAt) {
        const seconds = Math.ceil((latestTimer.endsAt - Date.now()) / 1000);
        const task = stateRef.current.tasks.find((item) => item.id === latestTimer.taskId);
        if (task && seconds > 0) {
          const notificationId = await scheduleTimerFinished(task.title, seconds, preferences.gentleSound).catch(() => null);
          if (notificationId) {
            if (accountKeyRef.current !== ownerKey) {
              void cancelReminder(notificationId);
              return;
            }
            const current = stateRef.current;
            if (current.timer?.taskId === latestTimer.taskId && current.timer.endsAt === latestTimer.endsAt && !current.timer.notificationId) {
              commit({ ...current, timer: { ...current.timer, notificationId } });
            } else {
              void cancelReminder(notificationId);
            }
          }
        }
      }
    }

    if (soundChanged) {
      for (const event of stateRef.current.calendarEvents) {
        if (!event.reminderEnabled || event.notificationId) continue;
        const triggerDate = eventReminderTriggerDate(event.dateKey, event.time, event.reminderOffsetMinutes);
        if (!triggerDate) continue;
        const notificationId = await scheduleCalendarReminder(event.title, triggerDate, preferences.gentleSound).catch(() => null);
        if (!notificationId) continue;
        if (accountKeyRef.current !== ownerKey) {
          void cancelReminder(notificationId);
          return;
        }
        const current = stateRef.current;
        const currentEvent = current.calendarEvents.find((item) => item.id === event.id);
        if (
          currentEvent?.reminderEnabled &&
          !currentEvent.notificationId &&
          currentEvent.title === event.title &&
          currentEvent.dateKey === event.dateKey &&
          currentEvent.time === event.time &&
          currentEvent.reminderOffsetMinutes === event.reminderOffsetMinutes
        ) {
          commit({ ...current, calendarEvents: current.calendarEvents.map((item) => item.id === event.id ? { ...item, notificationId } : item) });
        } else {
          void cancelReminder(notificationId);
        }
      }
    }
  }, [accountStorageKey, commit, ready, syncTaskReminders]);

  const remainingSeconds = state.timer
    ? Math.max(0, Math.ceil((state.timer.endsAt ? state.timer.endsAt - now : state.timer.remainingMs) / 1000))
    : 0;

  const value = useMemo<PlannerContextValue>(() => ({
    tasks: buildSchedule(state.tasks),
    completions: state.completions,
    calendarEvents: state.calendarEvents,
    preferences: state.preferences,
    timer: state.timer,
    now,
    ready,
    saveTasks,
    saveCalendarEvent,
    removeCalendarEvent,
    removeTask,
    toggleCompleted,
    moveTask,
    startTimer,
    toggleTimer,
    stopTimer,
    updatePreferences,
    remainingSeconds,
    dayKey: state.dayKey,
  }), [state, now, ready, saveTasks, saveCalendarEvent, removeCalendarEvent, removeTask, toggleCompleted, moveTask, startTimer, toggleTimer, stopTimer, updatePreferences, remainingSeconds]);

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

export function usePlanner(): PlannerContextValue {
  const value = useContext(PlannerContext);
  if (!value) throw new Error("usePlanner must be used inside PlannerProvider");
  return value;
}
