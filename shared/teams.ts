// Functional teams used to group people on the founder overview. Set per person in Internal -> Edit.
export const TEAMS = [
  "Sales",
  "MIS",
  "Development",
  "Marketing",
  "Design",
  "Dispatch",
  "Procurement",
  "Chief of Staff",
  "HR",
  "Accounts",
] as const;
export type Team = (typeof TEAMS)[number];

export const NO_TEAM = "No team set";

export function isTeam(value: unknown): value is Team {
  return typeof value === "string" && (TEAMS as readonly string[]).includes(value);
}
