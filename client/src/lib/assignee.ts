// Single place that decides who a story belongs to. `assignedTo` (user id) is authoritative;
// `person` is only a legacy display string and is matched by exact full name, never fuzzily,
// and only when the story has no real assignee.
type NamedUser = { id: string; firstName?: string | null; lastName?: string | null };
type AssignableStory = { assignedTo?: string | null; person?: string | null };

const norm = (s: string | null | undefined) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();

export function fullName(user: Pick<NamedUser, "firstName" | "lastName"> | null | undefined) {
  return `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
}

export function isAssignedTo(story: AssignableStory, user: NamedUser | null | undefined) {
  if (!user) return false;
  if (story.assignedTo) return story.assignedTo === user.id;
  const person = norm(story.person);
  return !!person && person !== "unassigned" && person === norm(fullName(user));
}

/** Name to show for a story: the assignee's current name, falling back to the stored text. */
export function assigneeName(story: AssignableStory, users: NamedUser[]) {
  if (story.assignedTo) {
    const u = users.find((x) => x.id === story.assignedTo);
    if (u) return fullName(u) || "Unassigned";
  }
  return story.person || "Unassigned";
}

/**
 * Who gave this story to its assignee: "by Deepak" on cards, "Assigned by Deepak Phogat" in details.
 * Someone who created a story for themselves shows "Self". Older stories without the record show nothing.
 */
export function assignedByLabel(story: { assignedTo?: string | null; assignedBy?: string | null }, users: NamedUser[], long = false) {
  if (!story.assignedBy) return "";
  if (story.assignedTo && story.assignedBy === story.assignedTo) return long ? "Self-assigned" : "Self";
  const u = users.find((x) => x.id === story.assignedBy);
  if (!u) return long ? "Assigned by a former member" : "";
  return long ? `Assigned by ${fullName(u)}` : `by ${u.firstName || fullName(u)}`;
}
