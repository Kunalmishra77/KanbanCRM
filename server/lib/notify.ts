// Builds and sends the personal notifications for leave / work-from-home / overtime requests.
import { storage } from "../storage.js";
import { canDecideRequest } from "../../shared/roles.js";
import type { EmployeeRequest, User } from "../../shared/schema.js";

const KIND: Record<string, string> = { leave: "leave", wfh: "work-from-home", ot: "overtime" };
const KIND_TITLE: Record<string, string> = { leave: "Leave", wfh: "Work from home", ot: "Overtime" };
const LINK = "/services";

const nice = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
};
export const spanText = (r: Pick<EmployeeRequest, "startDate" | "endDate">) => (r.startDate === r.endDate ? nice(r.startDate) : `${nice(r.startDate)} – ${nice(r.endDate)}`);
const label = (r: EmployeeRequest) => `${KIND[r.type] || r.type}${r.type === "ot" && r.hours ? ` (${Number(r.hours)} h)` : ""} request for ${spanText(r)}`;
export const personName = (u: Pick<User, "firstName" | "lastName" | "email"> | undefined | null) =>
  `${u?.firstName || ""} ${u?.lastName || ""}`.replace(/\s+/g, " ").trim() || u?.email || "Someone";

/** Everyone who is allowed to decide this person's request (and is not the person themself). */
async function approversFor(requester: User): Promise<User[]> {
  const all = await storage.getAllUsers();
  return all.filter((u) => u.id !== requester.id && canDecideRequest(u, requester));
}

/** A request was raised: confirm to the requester and ask every approver. */
export async function notifyRequestRaised(row: EmployeeRequest, requester: User) {
  const approvers = await approversFor(requester);
  const who = personName(requester);
  const names = approvers.map((a) => personName(a));
  await storage.createNotifications([
    {
      userId: requester.id, type: "request_submitted", entityId: row.id, entityType: "request", link: LINK,
      title: `${KIND_TITLE[row.type]} request sent`,
      message: `Your ${label(row)} is waiting for approval${names.length ? ` from ${names.join(", ")}` : ""}.`,
    },
    ...approvers.map((a) => ({
      userId: a.id, type: "request_pending", entityId: row.id, entityType: "request", link: LINK,
      title: `${who} needs your approval`,
      message: `${KIND_TITLE[row.type]} · ${spanText(row)}${row.type === "ot" && row.hours ? ` · ${Number(row.hours)} h` : ""}. Reason: ${row.reason.slice(0, 120)}`,
    })),
  ]);
}

/** A request was approved or rejected: tell the requester, tell the other approvers, clear the pending prompts. */
export async function notifyRequestDecided(row: EmployeeRequest, requester: User, decider: User) {
  const approved = row.status === "approved";
  const by = personName(decider);
  const verb = approved ? "approved" : "rejected";
  const note = row.decisionNote ? ` Note: ${row.decisionNote}` : "";
  const others = (await approversFor(requester)).filter((a) => a.id !== decider.id);
  await storage.markEntityNotificationsRead(row.id, ["request_pending", "request_submitted"]);
  await storage.createNotifications([
    {
      userId: requester.id, type: "request_decided", entityId: row.id, entityType: "request", link: LINK,
      title: `${KIND_TITLE[row.type]} ${verb}`,
      message: `${by} ${verb} your ${label(row)}.${note}`,
    },
    ...others.map((a) => ({
      userId: a.id, type: "request_decided_fyi", entityId: row.id, entityType: "request", link: LINK,
      title: `${by} ${verb} ${personName(requester)}'s request`,
      message: `${KIND_TITLE[row.type]} · ${spanText(row)}.${note}`,
    })),
  ]);
}

/** A pending request was withdrawn: its prompts disappear for the approvers. */
export async function clearWithdrawn(requestId: string) {
  await storage.deleteEntityNotifications(requestId, ["request_pending", "request_submitted"]);
}
