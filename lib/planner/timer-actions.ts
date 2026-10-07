import type { PlannerTimer } from "./types";

export type TimerFocusAction = "start" | "resume" | "open" | "restart";

export function resolveTimerFocusAction(taskId: string, timer: PlannerTimer | null, now = Date.now()): TimerFocusAction {
  if (!timer || timer.taskId !== taskId) return "start";

  const remainingMs = timer.endsAt !== null
    ? Math.max(0, timer.endsAt - now)
    : Math.max(0, timer.remainingMs);

  if (remainingMs === 0) return "restart";
  return timer.endsAt !== null ? "open" : "resume";
}
