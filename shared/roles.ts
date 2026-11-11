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
  // Founders: everything.
  isFounder: (u: U) => roleOf(u) === "founder",
  // Invoices, client revenue figures and the revenue insights.
  viewFinance: (u: U) => ["founder", "accountant"].includes(roleOf(u)),
  // Set the monthly revenue targets.
  setRevenueTargets: (u: U) => roleOf(u) === "founder",
  // Delete a client (removes all its stories, comments, invoices and files).
  deleteClients: (u: U) => roleOf(u) === "founder",
  // Salary and incentive records.
  viewPayroll: (u: U) => ["founder", "chief_of_staff", "accountant"].includes(roleOf(u)),
  // Edit salary and incentive records.
  editPayroll: (u: U) => ["founder", "chief_of_staff", "accountant"].includes(roleOf(u)),
  // Add/edit employees, the audit log, deleting client communication logs.
  manageTeam: (u: U) => ["founder", "chief_of_staff"].includes(roleOf(u)),
  // Employees' contact details (email, phone, shareholding).
  viewContactDetails: (u: U) => ["founder", "chief_of_staff", "accountant"].includes(roleOf(u)),
  // The company overview (every team and every person's tasks) on the dashboard.
  viewOverview: (u: U) => ["founder", "chief_of_staff"].includes(roleOf(u)),
  // Team performance analytics.
  viewTeamStats: (u: U) => ["founder", "hr", "chief_of_staff"].includes(roleOf(u)),
  // Every story on the boards. Everyone else only sees the stories assigned to them.
  viewAllStories: (u: U) => ["founder", "chief_of_staff"].includes(roleOf(u)),
  // May open the approvals queue for leave / work-from-home / overtime (what they can decide is canDecideRequest below).
  approveRequests: (u: U) => ["founder", "chief_of_staff"].includes(roleOf(u)),
  // Internal documents and founder investments.
  manageInternal: (u: U) => ["founder", "chief_of_staff", "accountant"].includes(roleOf(u)),
  // Post, edit and delete announcements.
  manageAnnouncements: (u: U) => ["founder", "chief_of_staff", "hr"].includes(roleOf(u)),
  // Repeating tasks for anyone or any team (everyone else may only set them up for themselves).
  manageAllRepeating: (u: U) => roleOf(u) === "founder",
};

type P = { id?: string | null; userType?: string | null } | null | undefined;
/**
 * Who may approve or reject whose request:
 *  - founder: anyone
 *  - chief of staff: employees, HR and accountants (not founders, not themselves)
 */
export function canDecideRequest(approver: P, requester: P): boolean {
  if (!approver || !requester) return false;
  const a = roleOf(approver);
  const r = roleOf(requester);
  if (a === "founder") return true;
  if (approver.id && approver.id === requester.id) return false;
  if (a === "chief_of_staff") return r === "employee" || r === "hr" || r === "accountant";
  return false;
}

type StoryOwner = { id?: string | null; firstName?: string | null; lastName?: string | null };
type OwnedStory = { assignedTo?: string | null; person?: string | null };
const normName = (s: string | null | undefined) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();
/** Is this story assigned to this person? `assignedTo` wins; the legacy `person` text only counts when it is empty. */
export function ownsStory(story: OwnedStory, user: StoryOwner | null | undefined): boolean {
  if (!user?.id) return false;
  if (story.assignedTo) return story.assignedTo === user.id;
  const person = normName(story.person);
  return !!person && person !== "unassigned" && person === normName(`${user.firstName || ""} ${user.lastName || ""}`);
}
/** May this person see (and work on) this story? Founders and the chief of staff see everything. */
export function canSeeStory(user: (StoryOwner & { userType?: string | null }) | null | undefined, story: OwnedStory): boolean {
  return perms.viewAllStories(user) || ownsStory(story, user);
}
/** Delete a story: founders any story, everyone else only stories assigned to them. */
export function canDeleteStory(user: (StoryOwner & { userType?: string | null }) | null | undefined, story: OwnedStory): boolean {
  return perms.isFounder(user) || ownsStory(story, user);
}
