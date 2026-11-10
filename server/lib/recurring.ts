import { storage } from "../storage.js";
import { planStories, personName, type Rule, type Leave, type Repeat } from "../../shared/schedule.js";
import { istDate } from "../../shared/istDate.js";

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
  const leaves: Leave[] = requests
    .filter((r) => r.type === "leave" && r.status === "approved")
    .map((r) => ({ userId: r.userId, startDate: r.startDate, endDate: r.endDate }));

  const plan = planStories({
    rules: rules.map((r) => ({ ...r, repeat: r.repeat as Repeat, description: r.description || "", assigneeIds: r.assigneeIds || [] })) as Rule[],
    people: users.map((u) => ({ id: u.id, firstName: u.firstName, lastName: u.lastName, team: u.team, workPattern: u.workPattern, userType: u.userType })),
    leaves,
    existing,
    date,
  });

  return storage.insertGeneratedStories(
    plan.map(({ rule, person, date: day, dueDate }) => ({
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
    })),
  );
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
