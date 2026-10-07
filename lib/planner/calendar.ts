import type { CalendarReminderOffset } from "./types";

export const calendarWeekdays = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"] as const;
export const calendarWeekdayNames = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"] as const;

export const reminderChoices: { offset: CalendarReminderOffset; label: string }[] = [
  { offset: 0, label: "Saatinde" },
  { offset: 10, label: "10 dk önce" },
  { offset: 60, label: "1 sa önce" },
  { offset: 1440, label: "1 gün önce" },
];

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function localDateFromKey(dateKey: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

export function localEventDate(dateKey: string, time: string): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  const timeMatch = /^(\d{2}):([0-5]\d)$/.exec(time);
  if (!dateMatch || !timeMatch) return null;
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (hour > 23) return null;
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  if (date.getHours() !== hour || date.getMinutes() !== minute) return null;
  return date;
}

export function isValidCalendarTime(time: string): boolean {
  const match = /^(\d{2}):([0-5]\d)$/.exec(time);
  return Boolean(match && Number(match[1]) <= 23);
}

export function calendarMonthCells(year: number, monthIndex: number): (number | null)[] {
  const first = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const mondayFirstOffset = (first.getDay() + 6) % 7;
  const cells: (number | null)[] = Array.from({ length: mondayFirstOffset }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function shiftCalendarMonth(month: Date, offset: number): Date {
  return new Date(month.getFullYear(), month.getMonth() + offset, 1);
}

export function calendarMonthLabel(date: Date): string {
  const label = date.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
  return label.charAt(0).toLocaleUpperCase("tr-TR") + label.slice(1);
}

export function calendarDateLabel(dateKey: string, options: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }): string {
  const date = localDateFromKey(dateKey);
  return date ? date.toLocaleDateString("tr-TR", options) : dateKey;
}

export function eventReminderTriggerDate(
  dateKey: string,
  time: string,
  offset: CalendarReminderOffset,
  now = Date.now(),
): Date | null {
  const eventDate = localEventDate(dateKey, time);
  if (!eventDate || eventDate.getTime() <= now) return null;
  const triggerDate = new Date(eventDate.getTime() - offset * 60_000);
  return triggerDate.getTime() > now ? triggerDate : null;
}

export function isCalendarDateInPast(dateKey: string, now = new Date()): boolean {
  return dateKey < localDateKey(now);
}
