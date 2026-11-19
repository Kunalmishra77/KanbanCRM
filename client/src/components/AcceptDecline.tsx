import { useState } from "react";
import { format } from "date-fns";
import { Check, X, Loader2, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAcceptStory, useDeclineStory } from "@/lib/queries";
import type { Story } from "@shared/schema";

/** "2026-11-19T18:00" for a datetime-local box: the story's due date, or today 6 PM if it has none / it's past. */
function defaultWhen(story: Story): string {
  const due = story.dueDate ? new Date(story.dueDate) : null;
  const base = due && due.getTime() > Date.now() ? due : (() => { const d = new Date(); d.setHours(18, 0, 0, 0); if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1); return d; })();
  return format(base, "yyyy-MM-dd'T'HH:mm");
}

/**
 * Accept (pick when you'll do it -> it moves into Mine with that due date) or Decline (with a reason -> it goes back
 * to whoever assigned it, the reason becomes a comment and they're notified).
 */
export function AcceptDecline({ story, giverName, compact = false, onDone }: { story: Story; giverName: string; compact?: boolean; onDone?: () => void }) {
  const accept = useAcceptStory();
  const decline = useDeclineStory();
  const { toast } = useToast();
  const [mode, setMode] = useState<null | "accept" | "decline">(null);
  const [when, setWhen] = useState(() => defaultWhen(story));
  const [reason, setReason] = useState("");
  const isRoutine = !!story.recurringTaskId;

  const doAccept = () => {
    const d = new Date(when);
    if (Number.isNaN(d.getTime())) return;
    accept.mutate({ id: story.id, dueDate: d.toISOString() }, {
      onSuccess: () => { setMode(null); onDone?.(); toast({ title: "Added to Mine", description: `"${story.title}" · due ${format(d, "d MMM, h:mm a")}. ${giverName} has been told.` }); },
      onError: (e: any) => toast({ title: "Could not accept", description: e?.message || "Please try again.", variant: "destructive" }),
    });
  };
  const doDecline = () => {
    if (!reason.trim()) return;
    decline.mutate({ id: story.id, reason: reason.trim() }, {
      onSuccess: () => { setMode(null); onDone?.(); toast({ title: "Declined", description: `Sent back to ${giverName} with your reason.` }); },
      onError: (e: any) => toast({ title: "Could not decline", description: e?.message || "Please try again.", variant: "destructive" }),
    });
  };

  return (
    <>
      <div className={compact ? "flex gap-2 shrink-0" : "flex gap-2"}>
        {!isRoutine && (
          <Button variant="outline" size="sm" className="h-9 gap-1.5 flex-1 sm:flex-none" onClick={() => { setReason(""); setMode("decline"); }} data-testid="waiting-decline">
            <X className="h-3.5 w-3.5" /> Decline
          </Button>
        )}
        <Button size="sm" className="h-9 gap-1.5 flex-1 sm:flex-none text-white" onClick={() => { setWhen(defaultWhen(story)); setMode("accept"); }} data-testid="waiting-accept">
          <Check className="h-3.5 w-3.5" /> Accept
        </Button>
      </div>

      <Dialog open={mode === "accept"} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>When will you do it?</DialogTitle>
            <DialogDescription className="break-words">"{story.title}" moves into <b>Mine</b> with this date and time. {giverName} will see it.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="accept-when" className="flex items-center gap-1.5"><CalendarClock className="h-4 w-4" />Date and time</Label>
            <Input id="accept-when" type="datetime-local" value={when} min={format(new Date(), "yyyy-MM-dd'T'HH:mm")} onChange={(e) => setWhen(e.target.value)} data-testid="accept-when" />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setMode(null)}>Cancel</Button>
            <Button className="text-white" disabled={!when || accept.isPending} onClick={doAccept} data-testid="accept-confirm">
              {accept.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Add to my work
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === "decline"} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Decline "{story.title}"?</DialogTitle>
            <DialogDescription>It goes back to {giverName} with your reason, so they can do it or give it to someone else.</DialogDescription>
          </DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} maxLength={2000}
            placeholder="For example: I already have 6 stories due this week. Can someone else take this, or can it wait until Monday?" data-testid="decline-reason" />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setMode(null)}>Cancel</Button>
            <Button variant="destructive" disabled={!reason.trim() || decline.isPending} onClick={doDecline} data-testid="decline-confirm">
              {decline.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Decline and send back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
