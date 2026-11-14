import { storage } from "../storage.js";
import { planStories, personName, type Rule, type Leave, type Repeat, type Person } from "../../shared/schedule.js";
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
 * Right after a repeating task is created (or resumed): put its next occurrence on the board for everyone
 * it is for, even when that day is later in the week or month, so it never "disappears" after saving.
 * Each person gets the first day from today on (within ~2 months) that the rule runs for them. Later days
 * are created by the daily scheduler as before; the database refuses duplicates.
 */
export async function generateNextOccurrences(ruleId: string): Promise<number> {
  const today = istDate();
  const [rules, users, requests, covered] = await Promise.all([
    storage.listRecurringTasks(),
    storage.getAllUsers(),
    storage.listEmployeeRequests(),
    storage.getUpcomingOccurrencePeople(ruleId, today),
  ]);
  const raw = rules.find((r) => r.id === ruleId);
  if (!raw || !raw.active) return 0;
  const rule = asRule(raw);
  const leaves = approvedLeaves(requests);
  let people = users.map(asPerson).filter((p) => !covered.has(p.id));
  const rows: ReturnType<typeof storyRow>[] = [];
  for (let i = 0; i < 62 && people.length; i++) {
    const date = addDays(today, i);
    const plan = planStories({ rules: [rule], people, leaves, existing: new Set(), date });
    rows.push(...plan.map(storyRow));
    const done = new Set(plan.map((p) => p.person.id));
    people = people.filter((p) => !done.has(p.id));
  }
  const created = await storage.insertGeneratedStories(rows);
  if (created > 0) broadcastChange();
  return created;
}

/**
 * When someone finishes a repeating story, put their NEXT copy on the board straight away (due on its
 * day), so the next Saturday's (or tomorrow's) task is already visible. The daily run then skips it.
 */
export async function generateNextAfterDone(ruleId: string, personId: string, afterDate: string): Promise<number> {
  const [rules, users, requests] = await Promise.all([storage.listRecurringTasks(), storage.getAllUsers(), storage.listEmployeeRequests()]);
  const raw = rules.find((r) => r.id === ruleId);
  const person = users.find((u) => u.id === personId);
  if (!raw || !raw.active || !person) return 0;
  const rule = asRule(raw);
  const leaves = approvedLeaves(requests);
  for (let i = 1; i <= 62; i++) {
    const date = addDays(afterDate, i);
    const plan = planStories({ rules: [rule], people: [asPerson(person)], leaves, existing: new Set(), date });
    if (plan.length) {
      const created = await storage.insertGeneratedStories(plan.map(storyRow));
      if (created > 0) broadcastChange();
      return created;
    }
  }
  return 0;
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
