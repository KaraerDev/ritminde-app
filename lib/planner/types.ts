export type Priority = "high" | "normal" | "gentle";

export type PlannerTask = {
  id: string;
  title: string;
  durationMinutes: number;
  priority: Priority;
  timeConstraint?: string;
  reminder: boolean;
  completedAt?: string;
  createdAt: string;
  notificationId?: string;
  sortOrder?: number;
};

export type CompletionEntry = {
  taskId: string;
  date: string;
  completedAt: string;
  plannedAt: string;
  onTime: boolean;
};

export type PlannerTimer = {
  taskId: string;
  endsAt: number | null;
  remainingMs: number;
  notificationId?: string;
};

export type CalendarReminderOffset = 0 | 10 | 60 | 1440;

export type PlannerCalendarEvent = {
  id: string;
  title: string;
  dateKey: string;
  time: string;
  durationMinutes: number;
  reminderEnabled: boolean;
  reminderOffsetMinutes: CalendarReminderOffset;
  notificationId?: string;
  createdAt: string;
  updatedAt: string;
};

export type CalendarEventDraft = Omit<PlannerCalendarEvent, "id" | "notificationId" | "createdAt" | "updatedAt">;

export type PlannerPreferences = {
  remindersEnabled: boolean;
  gentleSound: boolean;
  dailyReminderLimit: 1 | 2 | 3;
};

export type PlannerState = {
  dayKey: string;
  tasks: PlannerTask[];
  completions: CompletionEntry[];
  timer: PlannerTimer | null;
  preferences: PlannerPreferences;
  calendarEvents: PlannerCalendarEvent[];
};
