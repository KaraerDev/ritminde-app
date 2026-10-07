import type { PlannerTask } from "./types";

export type ScheduledTask = PlannerTask & { plannedTime: string; scheduleConflict?: boolean };

export function todayKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function minutesFromTime(value?: string): number | null {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function timeLabel(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(wrapped / 60)).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`;
}

const priorityScore = { high: 0, normal: 1, gentle: 2 } as const;
function compareRecommendations(a: PlannerTask, b: PlannerTask): number {
  const aTime = minutesFromTime(a.timeConstraint);
  const bTime = minutesFromTime(b.timeConstraint);
  if (aTime !== null && bTime !== null && aTime !== bTime) return aTime - bTime;
  if (aTime !== null && bTime === null) return -1;
  if (aTime === null && bTime !== null) return 1;
  return priorityScore[a.priority] - priorityScore[b.priority] || a.durationMinutes - b.durationMinutes || a.createdAt.localeCompare(b.createdAt);
}

export function prioritizeTasks(tasks: PlannerTask[]): PlannerTask[] {
  return [...tasks].sort(compareRecommendations);
}

export function mergeTaskOrder(existing: PlannerTask[], additions: PlannerTask[], editId?: string): PlannerTask[] {
  const ordered = buildSchedule(existing).map(({ plannedTime: _plannedTime, scheduleConflict: _conflict, ...task }) => task);
  if (editId && additions[0]) {
    const replacement = additions[0];
    return ordered.map((task, index) => ({ ...(task.id === editId ? replacement : task), sortOrder: index }));
  }
  const merged = [...ordered];
  for (const addition of prioritizeTasks(additions)) {
    const index = merged.findIndex((task) => compareRecommendations(addition, task) < 0);
    if (index < 0) merged.push(addition);
    else merged.splice(index, 0, addition);
  }
  return merged.map((task, sortOrder) => ({ ...task, sortOrder }));
}

const TRANSITION_MINUTES = 5;

export function buildSchedule(tasks: PlannerTask[], startAt = 8 * 60 + 30): ScheduledTask[] {
  const hasManualOrder = tasks.length > 0 && tasks.every((task) => typeof task.sortOrder === "number");
  const ordered = hasManualOrder
    ? [...tasks].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    : prioritizeTasks(tasks);
  const fixed = ordered
    .filter((task) => minutesFromTime(task.timeConstraint) !== null)
    .sort((a, b) => (minutesFromTime(a.timeConstraint) ?? 0) - (minutesFromTime(b.timeConstraint) ?? 0));
  const flexible = ordered.filter((task) => minutesFromTime(task.timeConstraint) === null);
  const scheduled: ScheduledTask[] = [];
  let cursor = startAt;
  let flexibleIndex = 0;

  for (const appointment of fixed) {
    const anchor = minutesFromTime(appointment.timeConstraint)!;
    while (flexibleIndex < flexible.length) {
      const task = flexible[flexibleIndex];
      const duration = Math.max(5, task.durationMinutes);
      if (anchor <= cursor || cursor + duration + TRANSITION_MINUTES > anchor) break;
      scheduled.push({ ...task, plannedTime: timeLabel(cursor) });
      cursor += duration + TRANSITION_MINUTES;
      flexibleIndex += 1;
    }

    const appointmentEnd = anchor + Math.max(5, appointment.durationMinutes);
    scheduled.push({ ...appointment, plannedTime: timeLabel(anchor) });
    cursor = Math.max(cursor, appointmentEnd + TRANSITION_MINUTES);
  }

  while (flexibleIndex < flexible.length) {
    const task = flexible[flexibleIndex++];
    scheduled.push({ ...task, plannedTime: timeLabel(cursor) });
    cursor += Math.max(5, task.durationMinutes) + TRANSITION_MINUTES;
  }

  const conflictAware = scheduled.map((task) => {
    const start = minutesFromTime(task.plannedTime) ?? 0;
    const end = start + Math.max(5, task.durationMinutes);
    const overlaps = scheduled.some((other) => {
      if (other.id === task.id) return false;
      const otherStart = minutesFromTime(other.plannedTime) ?? 0;
      const otherEnd = otherStart + Math.max(5, other.durationMinutes);
      return start < otherEnd && end > otherStart;
    });
    return overlaps ? { ...task, scheduleConflict: true } : task;
  });

  return conflictAware.sort((a, b) => (minutesFromTime(a.plannedTime) ?? 0) - (minutesFromTime(b.plannedTime) ?? 0));
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} dk`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} sa ${rest} dk` : `${hours} sa`;
}

export function dateLabel(date = new Date()): string {
  return new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long" }).format(date);
}

export function clockLabel(date = new Date()): string {
  return new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(date);
}
