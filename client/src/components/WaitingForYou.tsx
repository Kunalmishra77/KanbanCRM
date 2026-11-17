import { useState } from "react";
import { format } from "date-fns";
import { Check, Clock, Inbox, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAcceptStory, useStoryFeedback } from "@/lib/queries";
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
 * Top of "Assigned to me": work somebody else gave this person that they have not taken on yet.
 * Accept moves it into the columns below. "Send feedback" only sends a note to whoever assigned it;
 * the story keeps waiting until the person accepts it.
 */
export function WaitingForYou({ stories, users, clientName, onOpen }: Props) {
  const accept = useAcceptStory();
  const feedback = useStoryFeedback();
  const { toast } = useToast();
  const [feedbackFor, setFeedbackFor] = useState<Story | null>(null);
  const [text, setText] = useState("");

  if (stories.length === 0) return null;

  const sendFeedback = () => {
    if (!feedbackFor || !text.trim()) return;
    feedback.mutate({ id: feedbackFor.id, message: text.trim() }, {
      onSuccess: () => {
        toast({ title: "Feedback sent", description: `${nameOf(users, feedbackFor.assignedBy)} will see it. Accept the story when you are ready.` });
        setFeedbackFor(null); setText("");
      },
      onError: (e: any) => toast({ title: "Could not send feedback", description: e?.message || "Please try again.", variant: "destructive" }),
    });
  };

  return (
    <section className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-3 sm:p-4 space-y-3" data-testid="waiting-for-you">
      <div className="flex items-center gap-2">
        <Inbox className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Waiting for you · {stories.length}</h2>
        <span className="text-xs text-muted-foreground hidden sm:inline">Accept each one when you have room for it.</span>
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
                {s.dueDate && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />Due {format(new Date(s.dueDate), "d MMM")}</span>}
              </p>
            </button>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 flex-1 sm:flex-none"
                onClick={() => { setFeedbackFor(s); setText(""); }}
                data-testid="waiting-feedback"
              >
                <MessageSquare className="h-3.5 w-3.5" /> Send feedback
              </Button>
              <Button
                size="sm"
                className="h-9 gap-1.5 flex-1 sm:flex-none text-white"
                disabled={accept.isPending && accept.variables === s.id}
                onClick={() => accept.mutate(s.id, {
                  onSuccess: () => toast({ title: "Accepted", description: `"${s.title}" is now in your To Do.` }),
                  onError: (e: any) => toast({ title: "Could not accept", description: e?.message || "Please try again.", variant: "destructive" }),
                })}
                data-testid="waiting-accept"
              >
                {accept.isPending && accept.variables === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Accept
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <Dialog open={!!feedbackFor} onOpenChange={(o) => { if (!o) setFeedbackFor(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Feedback to {nameOf(users, feedbackFor?.assignedBy)}</DialogTitle>
            <DialogDescription className="break-words">
              About "{feedbackFor?.title}". The story stays here until you accept it.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="For example: I have 6 stories due this week, I can start this on Monday."
            rows={4}
            maxLength={2000}
            data-testid="feedback-text"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setFeedbackFor(null)}>Cancel</Button>
            <Button className="text-white" disabled={!text.trim() || feedback.isPending} onClick={sendFeedback} data-testid="feedback-send">
              {feedback.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Send feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
