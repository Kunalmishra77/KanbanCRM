// Run: npx tsx e2e/overview.test.ts   (no database; fixed clock: Wed 4 Nov 2026, 12:00 India time)
import assert from "node:assert/strict";
import { computeOverview } from "../server/lib/overview";
import { periodRange } from "../shared/istDate";

let n = 0;
const check = (name: string, actual: unknown, expected: unknown) => { assert.deepEqual(actual, expected, name); n++; };

const now = new Date("2026-11-04T06:30:00Z");
const u = (id: string, first: string, team: string | null, userType = "employee") => ({ id, firstName: first, lastName: "X", team, userType });
const users = [u("f", "Boss", null, "founder"), u("p", "Pooja", "Sales"), u("d", "Divya", "Sales"), u("r", "Ravi", "Development"), u("s", "Sam", null)];
const st = (id: string, assignedTo: string | null, status: string, due: string, updated: string) => ({ id, clientId: "c1", title: id, status, dueDate: due, updatedAt: updated, assignedTo });
const stories = [
  st("s1", "p", "Done", "2026-11-05T00:00:00+05:30", "2026-11-03T05:00:00Z"),
  st("s2", "p", "To Do", "2026-11-03T00:00:00+05:30", "2026-11-01T05:00:00Z"),
  st("s3", "d", "In Progress", "2026-11-10T00:00:00+05:30", "2026-11-02T05:00:00Z"),
  st("s4", "r", "Review", "2026-11-04T18:00:00+05:30", "2026-10-30T06:30:00Z"),
  st("s5", null, "To Do", "2026-11-04T18:00:00+05:30", "2026-11-04T01:00:00Z"),
];
const cm = (id: string, authorId: string, at: string, isSystem = false) => ({ id, storyId: "s1", authorId, authorName: null, body: "hello " + id, isSystem, createdAt: at });
const comments = [cm("c-p", "p", "2026-11-04T05:00:00Z"), cm("c-d", "d", "2026-11-02T05:00:00Z"), cm("c-sys", "p", "2026-11-04T05:30:00Z", true)];
const activity = [{ userId: "r", createdAt: "2026-11-04T04:00:00Z" }];
const run = (period: "today" | "week" | "month") => computeOverview({ users, stories, clients: [{ id: "c1", name: "Razorveda" }], comments, activity, period, now });

// period boundaries are India midnight, weeks start Monday
check("today start", periodRange("today", now).start.toISOString(), "2026-11-03T18:30:00.000Z");
check("week starts Monday 2 Nov IST", periodRange("week", now).start.toISOString(), "2026-11-01T18:30:00.000Z");
check("month starts 1 Nov IST", periodRange("month", now).start.toISOString(), "2026-10-31T18:30:00.000Z");
check("month ends 1 Dec IST", periodRange("month", now).end.toISOString(), "2026-11-30T18:30:00.000Z");
check("11pm IST Sunday still belongs to that week", periodRange("week", new Date("2026-11-08T17:00:00Z")).start.toISOString(), "2026-11-01T18:30:00.000Z");

const today = run("today");
const by = (o: ReturnType<typeof run>, id: string) => o.people.find((p) => p.id === id)!;
check("founders are not scored", today.people.some((p) => p.id === "f"), false);
check("Pooja today: attention because 1 overdue", [by(today, "p").health, by(today, "p").reason], ["attention", "1 overdue"]);
check("system comments do not count as activity", by(today, "p").comments, 1);
check("Divya today: assigned but silent -> inactive", by(today, "d").health, "inactive");
check("silent AND overdue is worse than silent: attention", [(computeOverview({ users, stories: [st("o", "d", "To Do", "2026-11-01T00:00:00+05:30", "2026-11-01T00:00:00Z")], clients: [], comments: [], activity: [], period: "today", now }).people.find((p) => p.id === "d")!)].map((p) => [p.health, p.reason])[0], ["attention", "1 overdue and no activity in this period"]);
check("Ravi today: update counts as activity, nothing overdue -> good", [by(today, "r").health, by(today, "r").actions], ["good", 1]);
check("Sam has nothing assigned -> idle", by(today, "s").health, "idle");
check("worst people sort first", today.people.map((p) => p.id), ["p", "d", "s", "r"]);
check("Pooja completed nothing today (s1 was finished yesterday)", by(today, "p").completed, 0);

const week = run("week");
check("Pooja week: 2 planned, 1 done", [by(week, "p").planned, by(week, "p").plannedDone], [2, 1]);
check("Pooja finished 1 this week", by(week, "p").completed, 1);
check("Divya's Monday comment makes her active for the week (nothing overdue) -> good", by(week, "d").health, "good");
const sales = week.teams.find((x) => x.team === "Sales")!;
check("Sales team rollup", [sales.people, sales.active, sales.planned, sales.plannedDone, sales.overdue], [2, 2, 2, 1, 1]);
check("people without a team are grouped, not lost", week.teams.some((x) => x.team === "No team set"), true);
check("teams come back in the configured order", week.teams.map((x) => x.team), ["Sales", "Development", "No team set"]);

check("review queue shows who and how long", week.review.map((r) => [r.title, r.assignee, r.waitingDays]), [["s4", "Ravi X", 5]]);
check("recent comments exclude system notes, newest first", week.recentComments.map((c) => c.id), ["c-p", "c-d"]);
check("summary counts", [week.summary.peopleWorking, week.summary.waitingReview, week.summary.overdue], [3, 1, 1]);

// under half done in a week -> attention even with nothing overdue
const half = computeOverview({ users, stories: [st("a", "d", "To Do", "2026-11-06T00:00:00+05:30", "2026-11-01T00:00:00Z"), st("b", "d", "To Do", "2026-11-07T00:00:00+05:30", "2026-11-01T00:00:00Z"), st("c", "d", "Done", "2026-11-06T00:00:00+05:30", "2026-11-03T00:00:00Z")], clients: [], comments, activity, period: "week", now });
check("under 50% of the week's plan done -> attention", [half.people.find((p) => p.id === "d")!.health, half.people.find((p) => p.id === "d")!.reason], ["attention", "Only 1 of 3 planned stories done"]);


// leave / wfh / overtime
const reqs = [
  { userId: "p", type: "leave", status: "approved", startDate: "2026-11-03", endDate: "2026-11-05", hours: null },
  { userId: "d", type: "wfh", status: "approved", startDate: "2026-11-04", endDate: "2026-11-04", hours: null },
  { userId: "r", type: "ot", status: "approved", startDate: "2026-11-03", endDate: "2026-11-03", hours: "2.5" },
  { userId: "r", type: "ot", status: "pending", startDate: "2026-11-04", endDate: "2026-11-04", hours: "4" },
  { userId: "s", type: "leave", status: "pending", startDate: "2026-11-04", endDate: "2026-11-04", hours: null },
];
const withReq = (period: "today" | "week" | "month") => computeOverview({ users, stories, clients: [], comments, activity, requests: reqs, period, now });
const leaveToday = withReq("today");
check("someone on approved leave today is 'away', not 'needs attention'", [leaveToday.people.find((p) => p.id === "p")!.health, leaveToday.people.find((p) => p.id === "p")!.away], ["away", "leave"]);
check("work from home is shown but still judged normally", [leaveToday.people.find((p) => p.id === "d")!.away, leaveToday.people.find((p) => p.id === "d")!.health], ["wfh", "inactive"]);
check("a pending leave request does not mark anyone away", leaveToday.people.find((p) => p.id === "s")!.away, null);
check("away list and pending count in the summary", [leaveToday.summary.awayToday.leave, leaveToday.summary.awayToday.wfh, leaveToday.summary.pendingRequests], [["Pooja X"], ["Divya X"], 2]);
check("only approved overtime counts, inside the period", [withReq("week").people.find((p) => p.id === "r")!.otHours, withReq("week").summary.otHours], [2.5, 2.5]);
check("overtime from earlier in the month is not in 'today'", withReq("today").people.find((p) => p.id === "r")!.otHours, 0);
check("leave does not hide a person in the week view", withReq("week").people.find((p) => p.id === "p")!.health === "away", false);
check("people on leave are not expected to be active in the team count", withReq("today").teams.find((x) => x.team === "Sales")!.active, 0);

console.log(`overview: ${n} checks passed`);
