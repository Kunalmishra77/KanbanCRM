import { format } from "date-fns";
import { Clock, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AcceptDecline } from "@/components/AcceptDecline";
import type { Story } from "@shared/schema";

type Props = {
  stories: Story[];
  users: any[];
  clientName: (id: string) => string;
  onOpen: (s: Story) => void;
};

const nameOf = (users: any[], id?: string | null) => {
  const u = users.find((x) => x.id === id);
  return u ? `${u.firstName || ""} ${u.lastName || ""}`.trim() : "Someone";
};

/**
 * "Assigned to me": new work somebody gave this person. For each one: Accept (pick when you'll do it; it moves
 * into Mine) or Decline (with a reason; it goes back to whoever assigned it).
 */
export function WaitingForYou({ stories, users, clientName, onOpen }: Props) {
  if (stories.length === 0) return null;
  return (
    <section className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-3 sm:p-4 space-y-3" data-testid="waiting-for-you">
      <div className="flex flex-wrap items-center gap-2">
        <Inbox className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">New work for you · {stories.length}</h2>
        <span className="text-xs text-muted-foreground">Accept and pick when you'll do it, or decline with a reason.</span>
      </div>
      <ul className="space-y-2">
        {stories.map((s) => (
          <li key={s.id} className="rounded-xl border bg-background p-3 flex flex-col sm:flex-row sm:items-center gap-3 min-w-0" data-testid="waiting-item">
            <button type="button" onClick={() => onOpen(s)} className="flex-1 min-w-0 text-left">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <Badge variant="outline" className="bg-primary/5 text-primary text-[10px] font-semibold px-2 py-0.5">{clientName(s.clientId)}</Badge>
                {s.priority === "High" && <Badge className="bg-red-500/10 text-red-600 dark:text-red-300 hover:bg-red-500/10 text-[10px] px-2 py-0.5">High</Badge>}
              </div>
              <p className="text-sm font-semibold text-foreground hover:text-primary break-words">{s.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3">
                <span data-testid="waiting-from">From {nameOf(users, s.assignedBy)}</span>
                {s.dueDate && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />They asked for {format(new Date(s.dueDate), "d MMM")}</span>}
              </p>
            </button>
            <AcceptDecline story={s} giverName={nameOf(users, s.assignedBy)} compact />
          </li>
        ))}
      </ul>
    </section>
  );
}
