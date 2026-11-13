// Sales days run on India time (UTC+5:30), whatever the server or the phone clock says.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function istDate(at: Date | number = Date.now()): string {
  return new Date(new Date(at).getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * A due date picked from the calendar arrives as midnight at the START of that day (India time), which
 * made a story "due Nov 13" overdue from 00:00 on the 13th, while repeating stories are due at 23:59.
 * A due date of exactly 00:00 India time therefore means "that day": it becomes 23:59 that day.
 * Any other time (a time someone chose) is kept.
 */
export function endOfDayIfDateOnly(d: Date): Date {
  const t = d.getTime();
  if (Number.isNaN(t)) return d;
  if ((t + IST_OFFSET_MS) % 86_400_000 !== 0) return d;
  return new Date(t + 86_400_000 - 60_000);
}

export function addDays(date: string, days: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export type Period = "today" | "week" | "month";
export const isPeriod = (v: unknown): v is Period => v === "today" || v === "week" || v === "month";

/** Start (inclusive) and end (exclusive) of the period containing `now`, in India time. Weeks start on Monday. */
export function periodRange(period: Period, now: Date | number = Date.now()): { start: Date; end: Date } {
  const today = istDate(now);
  let startDay = today;
  let endDay = addDays(today, 1);
  if (period === "week") {
    const dow = new Date(today + "T00:00:00Z").getUTCDay(); // 0 = Sunday
    startDay = addDays(today, -((dow + 6) % 7));
    endDay = addDays(startDay, 7);
  } else if (period === "month") {
    startDay = today.slice(0, 8) + "01";
    const next = new Date(startDay + "T00:00:00Z");
    next.setUTCMonth(next.getUTCMonth() + 1);
    endDay = next.toISOString().slice(0, 10);
  }
  return { start: new Date(startDay + "T00:00:00+05:30"), end: new Date(endDay + "T00:00:00+05:30") };
}
