// Rules for repeating tasks. Pure functions (no database) so they can be tested exactly.
import { addDays } from "./istDate";

export const WORK_PATTERNS = {
  "mon-sat": { label: "6 days (Mon–Sat)", off: [0] },
  "mon-fri": { label: "5 days (Mon–Fri)", off: [0, 6] },
  all: { label: "7 days", off: [] as number[] },
} as const;
export type WorkPattern = keyof typeof WORK_PATTERNS;
export const isWorkPattern = (v: unknown): v is WorkPattern => typeof v === "string" && v in WORK_PATTERNS;

export const REPEATS = ["daily", "weekly", "monthly"] as const;
export type Repeat = (typeof REPEATS)[number];
export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export type Rule = {
  id: string;
  clientId: string;
  title: string;
  description: string;
  priority: string;
  repeat: Repeat;
  weekday: number | null; // 0 = Sunday
  monthDay: number | null; // 1-31
  dueTime: string | null; // "HH:MM" India time, null = end of day
  startDate: string; // YYYY-MM-DD
  endDate: string | null;
  active: boolean;
  assigneeIds: string[];
  team: string | null; // when set, every current member of the team
};
export type Person = { id: string; firstName: string | null; lastName: string | null; team: string | null; workPattern: string | null; userType: string };
export type Leave = { userId: string; startDate: string; endDate: string };

const dow = (date: string) => new Date(date + "T00:00:00Z").getUTCDay();
const lastDayOfMonth = (date: string) => {
  const d = new Date(date.slice(0, 8) + "01T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(0);
  return d.getUTCDate();
};

export function isWorkingDay(pattern: string | null | undefined, date: string): boolean {
  const p = isWorkPattern(pattern) ? pattern : "mon-sat";
  return !(WORK_PATTERNS[p].off as readonly number[]).includes(dow(date));
}

/** Does this rule produce a task on this date (before looking at who is working that day)? */
export function ruleRunsOn(rule: Pick<Rule, "repeat" | "weekday" | "monthDay" | "startDate" | "endDate" | "active">, date: string): boolean {
  if (!rule.active || date < rule.startDate || (rule.endDate && date > rule.endDate)) return false;
  if (rule.repeat === "daily") return true;
  if (rule.repeat === "weekly") return rule.weekday === dow(date);
  if (rule.repeat === "monthly") {
    const want = Math.min(rule.monthDay ?? 1, lastDayOfMonth(date)); // 31st rolls back to the last day in short months
    return Number(date.slice(8, 10)) === want;
  }
  return false;
}

/** The moment a task is due: the chosen time that day in India time, or the end of the day. */
export function dueAt(date: string, dueTime: string | null): Date {
  return new Date(`${date}T${dueTime && /^\d{2}:\d{2}$/.test(dueTime) ? dueTime : "23:59"}:00+05:30`);
}

export const personName = (u: { firstName: string | null; lastName: string | null }) => `${u.firstName || ""} ${u.lastName || ""}`.replace(/\s+/g, " ").trim();

export const occurrenceKey = (ruleId: string, userId: string, date: string) => `${ruleId}|${userId}|${date}`;

export function onLeave(leaves: Leave[], userId: string, date: string) {
  return leaves.some((l) => l.userId === userId && l.startDate <= date && date <= l.endDate);
}

/**
 * Which stories should exist on `date`. `existing` holds keys that were already created, so running this
 * twice (or after a restart) never duplicates anything.
 */
export function planStories(input: { rules: Rule[]; people: Person[]; leaves: Leave[]; existing: Set<string>; date: string }) {
  const out: { rule: Rule; person: Person; date: string; dueDate: Date; key: string }[] = [];
  for (const rule of input.rules) {
    if (!ruleRunsOn(rule, input.date)) continue;
    const targets = rule.team
      ? input.people.filter((p) => p.team === rule.team && p.userType !== "founder")
      : input.people.filter((p) => rule.assigneeIds.includes(p.id));
    for (const person of targets) {
      const key = occurrenceKey(rule.id, person.id, input.date);
      if (input.existing.has(key)) continue;
      if (onLeave(input.leaves, person.id, input.date)) continue;
      // Daily and weekly tasks respect days off; a monthly deliverable is still due
      if (rule.repeat !== "monthly" && !isWorkingDay(person.workPattern, input.date)) continue;
      out.push({ rule, person, date: input.date, dueDate: dueAt(input.date, rule.dueTime), key });
    }
  }
  return out;
}

export { addDays };
