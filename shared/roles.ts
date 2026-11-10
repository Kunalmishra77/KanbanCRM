// Single source of truth for roles and what each one may do. Used by both server and client.
export const ROLES = ["founder", "chief_of_staff", "hr", "accountant", "employee"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  founder: "Founder",
  chief_of_staff: "Chief of Staff",
  hr: "HR",
  accountant: "Accountant",
  employee: "Employee",
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

// Rows written before the rename store "co-founder"; anything unknown is treated as the least-privileged role.
export function roleOf(user: { userType?: string | null } | null | undefined): Role {
  const t = user?.userType;
  if (t === "co-founder") return "founder";
  return isRole(t) ? t : "employee";
}

type U = { userType?: string | null } | null | undefined;

export const perms = {
  // Everything, including internal documents, investments, announcements, leads and client deletion.
  isFounder: (u: U) => roleOf(u) === "founder",
  // Invoices, client revenue figures, revenue targets and the revenue insights.
  viewFinance: (u: U) => ["founder", "accountant"].includes(roleOf(u)),
  // Salary and incentive records.
  viewPayroll: (u: U) => ["founder", "hr", "accountant"].includes(roleOf(u)),
  // Edit salary and incentive records.
  editPayroll: (u: U) => ["founder", "hr", "accountant"].includes(roleOf(u)),
  // Add/edit employees, see the audit log, delete tasks and communication logs.
  manageTeam: (u: U) => ["founder", "hr"].includes(roleOf(u)),
  // The company overview (every team and every person's tasks) on the dashboard.
  viewOverview: (u: U) => ["founder", "chief_of_staff"].includes(roleOf(u)),
  // Team performance analytics.
  viewTeamStats: (u: U) => ["founder", "hr", "chief_of_staff"].includes(roleOf(u)),
  // May open the approvals queue for leave / work-from-home / overtime (what they can decide is canDecide below).
  approveRequests: (u: U) => ["founder", "hr", "chief_of_staff"].includes(roleOf(u)),
};

type P = { id?: string | null; userType?: string | null } | null | undefined;
/**
 * Who may approve or reject whose request:
 *  - founder: anyone
 *  - chief of staff: employees, HR and accountants (not founders, not themselves)
 *  - HR: employees and accountants (not themselves)
 */
export function canDecideRequest(approver: P, requester: P): boolean {
  if (!approver || !requester) return false;
  const a = roleOf(approver);
  const r = roleOf(requester);
  if (a === "founder") return true;
  if (approver.id && approver.id === requester.id) return false;
  if (a === "chief_of_staff") return r === "employee" || r === "hr" || r === "accountant";
  if (a === "hr") return r === "employee" || r === "accountant";
  return false;
}
