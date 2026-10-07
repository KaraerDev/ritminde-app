import type { PlannerState } from "./types";

/** Start a new daily plan without dropping member-owned future calendar events. */
export function rollPlannerStateToDay(state: PlannerState, dayKey: string): PlannerState {
  if (state.dayKey === dayKey) return state;
  return {
    ...state,
    dayKey,
    tasks: [],
    timer: null,
  };
}
