import { storage } from "../storage.js";
import { planStories, personName, occurrenceKey, type Rule, type Leave, type Repeat, type Person } from "../../shared/schedule.js";
import { istDate, addDays } from "../../shared/istDate.js";
import { broadcastChange } from "./live.js";

/**
 * Creates today's stories from the repeating-task rules. Safe to run any number of times:
 * what already exists is skipped (and the database enforces one story per rule, person and day).
 */
const asRule = (r: any): Rule => ({ ...r, repeat: r.repeat as Repeat, description: r.description || "", assigneeIds: r.assigneeIds || [], excludeIds: r.excludeIds || [], weekdays: r.weekdays || null });
const asPerson = (u: any): Person => ({ id: u.id, firstName: u.firstName, lastName: u.lastName, team: u.team, workPattern: u.workPattern, userType: u.userType });
const approvedLeaves = (requests: any[]): Leave[] =>
  requests.filter((r) => r.type === "leave" && r.status === "approved").map((r) => ({ userId: r.userId, startDate: r.startDate, endDate: r.endDate }));
const storyRow = ({ rule, person, date: day, dueDate }: { rule: Rule; person: Person; date: string; dueDate: Date }) => ({
  clientId: rule.clientId,
  title: rule.title,
  description: rule.description,
  assignedTo: person.id,
  person: personName(person),
  priority: rule.priority,
  estimatedEffortHours: 0,
  dueDate,
  status: "To Do",
  progressPercent: 0,
  tags: ["recurring", rule.repeat],
  recurringTaskId: rule.id,
  occurrenceDate: day,
});

/**
 * Creates today's stories from the repeating-task rules. Safe to run any number of times:
 * what already exists is skipped (and the database enforces one story per rule, person and day).
 */
export async function generateRecurringStories(date: string = istDate()): Promise<number> {
  // A new day: yesterday's (and older) copies still open move to Done before today's fresh ones come in
  const closed = await storage.closePastRepeatingCopies(date);
  if (closed > 0) {
    console.log(`Scheduler: moved ${closed} past repeating copies to Done`);
    broadcastChange();
  }
  const [rules, users, requests, existing] = await Promise.all([
    storage.listRecurringTasks(),
    storage.getAllUsers(),
    storage.listEmployeeRequests(),
    storage.getOccurrenceKeys(date),
  ]);
  const plan = planStories({ rules: rules.map(asRule), people: users.map(asPerson), leaves: approvedLeaves(requests), existing, date });
  const created = await storage.insertGeneratedStories(plan.map(storyRow));
  if (created > 0) broadcastChange(); // new stories appear on open boards straight away
  return created;
}

/**
 * Right after a repeating task is created (or resumed): if it runs TODAY, today's copy appears at once.
 * Copies for later days are created only by the 12:00 AM IST run on their own day, never earlier; finishing
 * a copy does not create the next one. The database refuses duplicates.
 */
export async function generateNextOccurrences(ruleId: string): Promise<number> {
  const today = istDate();
  await storage.closePastRepeatingCopies(today);
  const [rules, users, requests, copies] = await Promise.all([
    storage.listRecurringTasks(),
    storage.getAllUsers(),
    storage.listEmployeeRequests(),
    storage.getRuleOccurrences(ruleId, today),
  ]);
  const raw = rules.find((r) => r.id === ruleId);
  if (!raw || !raw.active) return 0;
  const rule = asRule(raw);
  const leaves = approvedLeaves(requests);
  // Someone who already has an unfinished copy waiting is fine; finished copies do not count
  const waiting = new Set(copies.filter((c) => c.status !== "Done").map((c) => c.assignedTo));
  const existing = new Set(copies.map((c) => occurrenceKey(rule.id, c.assignedTo || "", c.occurrenceDate || "")));
  let people = users.map(asPerson).filter((p) => !waiting.has(p.id));
  const rows: ReturnType<typeof storyRow>[] = [];
  // Only TODAY: new copies for later days arrive in the 12:00 AM IST run, never earlier (user's rule, 16 Nov)
  for (let i = 0; i < 1 && people.length; i++) {
    const date = addDays(today, i);
    const plan = planStories({ rules: [rule], people, leaves, existing, date }); // days that already have a copy are skipped
    rows.push(...plan.map(storyRow));
    const done = new Set(plan.map((p) => p.person.id));
    people = people.filter((p) => !done.has(p.id));
  }
  const created = await storage.insertGeneratedStories(rows);
  if (created > 0) broadcastChange();
  return created;
}

export function startRecurringScheduler() {
  const tick = async () => {
    try {
      const created = await generateRecurringStories();
      if (created > 0) console.log(`Scheduler: created ${created} repeating task(s) for ${istDate()}`);
    } catch (err) {
      console.error("Scheduler: repeating tasks failed", err);
    }
  };
  setInterval(tick, 10 * 60 * 1000).unref(); // also catches a late start or a restart after midnight
  void tick();
}
