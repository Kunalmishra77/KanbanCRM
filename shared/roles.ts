// Single source of truth for roles and what each one may do. Used by both server and client.
export const ROLES = ["founder", "hr", "accountant", "employee"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  founder: "Founder",
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
  // Add/edit employees, see team analytics and the audit log, delete tasks and communication logs.
  manageTeam: (u: U) => ["founder", "hr"].includes(roleOf(u)),
};
