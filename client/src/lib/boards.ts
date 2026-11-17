// Which board a story belongs to for the signed-in person.
//  - My Work:        stories they made for themselves (and old stories with no record of who assigned them)
//  - Assigned to me: stories somebody else gave them (repeating copies of a task someone else set up too)
//  - Assigned by me: stories they gave to somebody else
import { ownsStory } from "@shared/roles";
import type { Story } from "@shared/schema";

export type Board = "mine" | "assigned" | "given" | "all";
export const BOARDS: Board[] = ["mine", "assigned", "given", "all"];
type Me = { id?: string | null; firstName?: string | null; lastName?: string | null } | null | undefined;

const byOther = (s: Pick<Story, "assignedBy">, me: Me) => !!s.assignedBy && s.assignedBy !== me?.id;

export function inBoard(s: Story, board: Board, me: Me): boolean {
  if (board === "all") return true;
  const mine = ownsStory(s, me);
  if (board === "mine") return mine && !byOther(s, me);
  if (board === "assigned") return mine && byOther(s, me);
  return !mine && !!me?.id && s.assignedBy === me.id; // given
}

/** Given to me by someone else and not accepted yet: waits at the top of "Assigned to me". */
export function isWaiting(s: Story, me: Me): boolean {
  return ownsStory(s, me) && byOther(s, me) && !(s as any).acceptedAt;
}

/** The board a story lives on for this person (used when a link opens one story). */
export function boardOf(s: Story, me: Me): Board {
  return (["mine", "assigned", "given"] as Board[]).find((b) => inBoard(s, b, me)) ?? "all";
}
