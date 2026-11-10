// Run: npx tsx e2e/schedule.test.ts
import assert from "node:assert/strict";
import { planStories, ruleRunsOn, isWorkingDay, dueAt, occurrenceKey, type Rule, type Person } from "../shared/schedule";

let n = 0;
const check = (name: string, actual: unknown, expected: unknown) => { assert.deepEqual(actual, expected, name); n++; };

const rule = (o: Partial<Rule> = {}): Rule => ({ id: "r1", clientId: "c1", title: "P&L report", description: "", priority: "Medium", repeat: "daily", weekday: null, monthDay: null, dueTime: null, startDate: "2026-11-01", endDate: null, active: true, assigneeIds: ["a"], team: null, ...o });
const person = (id: string, team: string | null, workPattern: string | null = "mon-sat", userType = "employee"): Person => ({ id, firstName: id, lastName: "X", team, workPattern, userType });

// 2026-11-06 is a Friday, 07 Saturday, 08 Sunday, 09 Monday
check("6-day worker: Saturday works, Sunday is off", [isWorkingDay("mon-sat", "2026-11-07"), isWorkingDay("mon-sat", "2026-11-08")], [true, false]);
check("5-day worker: Saturday and Sunday are off", [isWorkingDay("mon-fri", "2026-11-07"), isWorkingDay("mon-fri", "2026-11-08")], [false, false]);
check("7-day worker never has a day off", isWorkingDay("all", "2026-11-08"), true);
check("unknown pattern falls back to 6 days", isWorkingDay("nonsense", "2026-11-08"), false);

check("daily runs every day inside its dates", [ruleRunsOn(rule(), "2026-11-06"), ruleRunsOn(rule(), "2026-10-31"), ruleRunsOn(rule({ endDate: "2026-11-05" }), "2026-11-06")], [true, false, false]);
check("paused rule never runs", ruleRunsOn(rule({ active: false }), "2026-11-06"), false);
check("weekly runs only on its weekday (Friday)", [ruleRunsOn(rule({ repeat: "weekly", weekday: 5 }), "2026-11-06"), ruleRunsOn(rule({ repeat: "weekly", weekday: 5 }), "2026-11-07")], [true, false]);
check("monthly runs on its day", [ruleRunsOn(rule({ repeat: "monthly", monthDay: 6 }), "2026-11-06"), ruleRunsOn(rule({ repeat: "monthly", monthDay: 6 }), "2026-11-07")], [true, false]);
check("monthly on the 31st rolls back to the last day of a short month", [ruleRunsOn(rule({ repeat: "monthly", monthDay: 31 }), "2026-11-30"), ruleRunsOn(rule({ repeat: "monthly", monthDay: 31 }), "2026-11-29"), ruleRunsOn(rule({ repeat: "monthly", monthDay: 31 }), "2026-12-31")], [true, false, true]);
check("monthly on the 29th in a non-leap February lands on the 28th", ruleRunsOn(rule({ repeat: "monthly", monthDay: 29, startDate: "2026-01-01" }), "2026-02-28"), true);

check("due at end of day by default (India time)", dueAt("2026-11-06", null).toISOString(), "2026-11-06T18:29:00.000Z");
check("due at a chosen time (7 pm India)", dueAt("2026-11-06", "19:00").toISOString(), "2026-11-06T13:30:00.000Z");

const people = [person("a", "MIS"), person("b", "MIS"), person("c", "MIS", "mon-fri"), person("d", "Sales"), person("boss", "MIS", "all", "founder")];
const plan = (r: Rule[], date: string, leaves: { userId: string; startDate: string; endDate: string }[] = [], existing = new Set<string>()) => planStories({ rules: r, people, leaves, existing, date });

check("a rule for one person creates one story", plan([rule()], "2026-11-06").map((x) => x.person.id), ["a"]);
check("a team rule reaches every member, not other teams or founders", plan([rule({ assigneeIds: [], team: "MIS" })], "2026-11-06").map((x) => x.person.id), ["a", "b", "c"]);
check("Saturday: the 5-day worker is skipped, 6-day workers are not", plan([rule({ assigneeIds: [], team: "MIS" })], "2026-11-07").map((x) => x.person.id), ["a", "b"]);
check("Sunday: nobody on a 6 or 5 day week", plan([rule({ assigneeIds: [], team: "MIS" })], "2026-11-08").map((x) => x.person.id), []);
check("a 7-day worker gets Sunday's task", plan([rule({ assigneeIds: ["boss"] })], "2026-11-08").map((x) => x.person.id), ["boss"]);
check("approved leave skips that person only", plan([rule({ assigneeIds: [], team: "MIS" })], "2026-11-06", [{ userId: "a", startDate: "2026-11-05", endDate: "2026-11-07" }]).map((x) => x.person.id), ["b", "c"]);
check("leave that has ended no longer skips", plan([rule()], "2026-11-09", [{ userId: "a", startDate: "2026-11-05", endDate: "2026-11-07" }]).map((x) => x.person.id), ["a"]);
check("running again creates nothing new", plan([rule()], "2026-11-06", [], new Set([occurrenceKey("r1", "a", "2026-11-06")])).length, 0);
check("a monthly task still lands on a day off", plan([rule({ repeat: "monthly", monthDay: 8 })], "2026-11-08").map((x) => x.person.id), ["a"]);
check("weekly task on a person's day off is skipped", plan([rule({ repeat: "weekly", weekday: 0 })], "2026-11-08").length, 0);
check("a new team member is picked up automatically", planStories({ rules: [rule({ assigneeIds: [], team: "Sales" })], people: [...people, person("e", "Sales")], leaves: [], existing: new Set(), date: "2026-11-06" }).map((x) => x.person.id), ["d", "e"]);
check("due date is carried onto each planned story", plan([rule({ dueTime: "19:00" })], "2026-11-06")[0].dueDate.toISOString(), "2026-11-06T13:30:00.000Z");

console.log(`schedule: ${n} checks passed`);
