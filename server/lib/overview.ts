import { periodRange, istDate, type Period } from "../../shared/istDate.js";
import { TEAMS, NO_TEAM } from "../../shared/teams.js";

type U = { id: string; firstName: string | null; lastName: string | null; team?: string | null; userType: string };
type S = { id: string; clientId: string; title: string; status: string; dueDate: Date | string; updatedAt: Date | string; assignedTo: string | null };
type C = { id: string; name: string };
type Cm = { id: string; storyId: string; authorId: string; authorName: string | null; body: string; isSystem: boolean; createdAt: Date | string };
type A = { userId: string; createdAt: Date | string };
type R = { userId: string; type: string; status: string; startDate: string; endDate: string; hours: string | null };

export type Health = "good" | "attention" | "inactive" | "idle" | "away";

export type PersonRow = {
  id: string; name: string; team: string;
  assigned: number; open: number; overdue: number; review: number;
  planned: number; plannedDone: number; completed: number;
  comments: number; actions: number; lastActiveAt: string | null; health: Health; reason: string;
  away: "leave" | "wfh" | null; otHours: number;
};
export type TeamRow = {
  team: string; people: number; active: number;
  planned: number; plannedDone: number; completed: number; overdue: number; review: number; health: Health; reason: string;
};

const DAY = 86_400_000;
const t = (d: Date | string) => new Date(d).getTime();
export const nameOf = (u: { firstName: string | null; lastName: string | null }) => `${u.firstName || ""} ${u.lastName || ""}`.replace(/\s+/g, " ").trim();

/**
 * Health rules (kept deliberately simple so they can be explained to a team):
 *  - idle:       nothing is assigned to them at all
 *  - inactive:   assigned work, but no comment or update in the period
 *  - attention:  something is overdue, or (week/month) under half of the stories due in the period are done
 *  - good:       otherwise
 */
function judge(period: Period, x: { assigned: number; active: boolean; overdue: number; planned: number; plannedDone: number; away?: "leave" | "wfh" | null }): { health: Health; reason: string } {
  if (period === "today" && x.away === "leave") return { health: "away", reason: "On approved leave today" };
  if (x.assigned === 0) return { health: "idle", reason: "No stories assigned" };
  if (!x.active && x.overdue > 0) return { health: "attention", reason: `${x.overdue} overdue and no activity in this period` };
  if (!x.active) return { health: "inactive", reason: "No comments or updates in this period" };
  if (x.overdue > 0) return { health: "attention", reason: `${x.overdue} overdue` };
  if (period !== "today" && x.planned > 0 && x.plannedDone / x.planned < 0.5) return { health: "attention", reason: `Only ${x.plannedDone} of ${x.planned} planned stories done` };
  return { health: "good", reason: "On track" };
}

export function computeOverview(input: { users: U[]; stories: S[]; clients: C[]; comments: Cm[]; activity: A[]; requests?: R[]; period: Period; now?: Date }) {
  const now = input.now ?? new Date();
  const { start, end } = periodRange(input.period, now);
  const inPeriod = (d: Date | string) => t(d) >= start.getTime() && t(d) < Math.min(end.getTime(), now.getTime() + 1);
  const clientName = new Map(input.clients.map((c) => [c.id, c.name]));
  const storyById = new Map(input.stories.map((s) => [s.id, s]));
  const people = input.users.filter((u) => u.userType !== "founder");
  const today = istDate(now);
  const requests = input.requests ?? [];
  const approved = requests.filter((r) => r.status === "approved");

  const rows: PersonRow[] = people.map((u) => {
    const mine = input.stories.filter((s) => s.assignedTo === u.id);
    const open = mine.filter((s) => s.status !== "Done");
    const overdue = open.filter((s) => t(s.dueDate) < now.getTime());
    const planned = mine.filter((s) => t(s.dueDate) >= start.getTime() && t(s.dueDate) < end.getTime());
    const myComments = input.comments.filter((c) => c.authorId === u.id && !c.isSystem);
    const periodComments = myComments.filter((c) => inPeriod(c.createdAt));
    const myActions = input.activity.filter((a) => a.userId === u.id);
    const periodActions = myActions.filter((a) => inPeriod(a.createdAt));
    const stamps = [...myComments.map((c) => t(c.createdAt)), ...myActions.map((a) => t(a.createdAt))];
    const awayKind = (["leave", "wfh"] as const).find((k) => approved.some((r) => r.userId === u.id && r.type === k && r.startDate <= today && today <= r.endDate)) ?? null;
    const otHours = approved.filter((r) => r.userId === u.id && r.type === "ot" && t(r.startDate + "T00:00:00+05:30") >= start.getTime() && t(r.startDate + "T00:00:00+05:30") < end.getTime()).reduce((a, r) => a + Number(r.hours || 0), 0);
    const row = {
      id: u.id, name: nameOf(u) || "Unnamed", team: u.team || NO_TEAM,
      assigned: mine.length, open: open.length, overdue: overdue.length, review: open.filter((s) => s.status === "Review").length,
      planned: planned.length, plannedDone: planned.filter((s) => s.status === "Done").length,
      completed: mine.filter((s) => s.status === "Done" && inPeriod(s.updatedAt)).length,
      comments: periodComments.length, actions: periodActions.length,
      lastActiveAt: stamps.length ? new Date(Math.max(...stamps)).toISOString() : null,
      away: awayKind, otHours,
    };
    const j = judge(input.period, { assigned: row.assigned, active: row.comments + row.actions > 0, overdue: row.overdue, planned: row.planned, plannedDone: row.plannedDone, away: row.away });
    return { ...row, ...j };
  });

  const order: Record<Health, number> = { attention: 0, inactive: 1, idle: 2, good: 3, away: 4 };
  rows.sort((a, b) => order[a.health] - order[b.health] || b.overdue - a.overdue || a.name.localeCompare(b.name));

  const teamNames = [...TEAMS as readonly string[], NO_TEAM];
  const teams: TeamRow[] = teamNames
    .map((team) => {
      const m = rows.filter((r) => r.team === team);
      const sum = (k: keyof PersonRow) => m.reduce((a, r) => a + (r[k] as number), 0);
      const working = m.filter((r) => r.assigned > 0 && !(input.period === "today" && r.away === "leave"));
      const active = working.filter((r) => r.comments + r.actions > 0).length;
      const j = judge(input.period, { assigned: working.length ? 1 : 0, active: active > 0, overdue: sum("overdue"), planned: sum("planned"), plannedDone: sum("plannedDone") });
      return { team, people: m.length, active, planned: sum("planned"), plannedDone: sum("plannedDone"), completed: sum("completed"), overdue: sum("overdue"), review: sum("review"), health: j.health, reason: j.reason };
    })
    .filter((x) => x.people > 0);

  const nameById = new Map(rows.map((r) => [r.id, r]));
  const review = input.stories
    .filter((s) => s.status === "Review")
    .map((s) => ({
      storyId: s.id, title: s.title, clientId: s.clientId, client: clientName.get(s.clientId) || "Client",
      assignee: (s.assignedTo && nameById.get(s.assignedTo)?.name) || "Unassigned", team: (s.assignedTo && nameById.get(s.assignedTo)?.team) || NO_TEAM,
      waitingDays: Math.max(0, Math.floor((now.getTime() - t(s.updatedAt)) / DAY)),
    }))
    .sort((a, b) => b.waitingDays - a.waitingDays);

  const recentComments = input.comments
    .filter((c) => !c.isSystem && inPeriod(c.createdAt))
    .sort((a, b) => t(b.createdAt) - t(a.createdAt))
    .slice(0, 25)
    .map((c) => {
      const s = storyById.get(c.storyId);
      return { id: c.id, author: c.authorName || nameById.get(c.authorId)?.name || "Someone", body: c.body.length > 180 ? c.body.slice(0, 180) + "…" : c.body, storyTitle: s?.title || "Story", clientId: s?.clientId || "", client: s ? clientName.get(s.clientId) || "" : "", at: new Date(c.createdAt).toISOString() };
    });

  const working = rows.filter((r) => r.assigned > 0 && !(input.period === "today" && r.away === "leave"));
  const summary = {
    peopleWorking: working.length,
    peopleActive: working.filter((r) => r.comments + r.actions > 0).length,
    planned: rows.reduce((a, r) => a + r.planned, 0),
    plannedDone: rows.reduce((a, r) => a + r.plannedDone, 0),
    completed: rows.reduce((a, r) => a + r.completed, 0),
    overdue: rows.reduce((a, r) => a + r.overdue, 0),
    waitingReview: review.length,
    pendingRequests: requests.filter((r) => r.status === "pending").length,
    awayToday: { leave: rows.filter((r) => r.away === "leave").map((r) => r.name), wfh: rows.filter((r) => r.away === "wfh").map((r) => r.name) },
    otHours: rows.reduce((a, r) => a + r.otHours, 0),
    comments: input.comments.filter((c) => !c.isSystem && inPeriod(c.createdAt)).length,
  };

  return { period: input.period, from: start.toISOString(), to: end.toISOString(), summary, teams, people: rows, review, recentComments };
}
