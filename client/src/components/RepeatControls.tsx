import { useState } from "react";
import { Pause, Play, Repeat, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRecurringTasks, useToggleRecurringTask, useDeleteRecurringTask } from "@/lib/serviceQueries";
import { repeatLabel } from "@shared/schedule";
import { perms } from "@shared/roles";
import { useAuth } from "@/lib/auth";

/**
 * Shown in a story that came from a repeating task: how often it repeats, Pause / Resume, and "Delete for good"
 * for whoever may manage it (whoever set it up, founders, the chief of staff). Deleting removes the task and its
 * unfinished copies, so it never comes back; finished copies stay as history.
 */
export function RepeatControls({ ruleId, setBy }: { ruleId: string; setBy?: string }) {
  const { data: rules = [], isLoading } = useRecurringTasks(true);
  const toggle = useToggleRecurringTask();
  const remove = useDeleteRecurringTask();
  const [confirming, setConfirming] = useState(false);
  const me = useAuth().user;
  const rule = rules.find((r) => r.id === ruleId);
  const canDelete = !!rule && (perms.manageAllRepeating(me) || (rule as any).createdBy === me?.id);

  return (
    <div data-testid="repeat-controls">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Repeats</h4>
      {isLoading ? null : !rule ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Repeat className="h-4 w-4 text-primary shrink-0" />
          {perms.manageAllRepeating(me) || setBy === `${me?.firstName || ""} ${me?.lastName || ""}`.trim()
            ? "This repeating task was deleted, so no more copies will come. This copy stays as history."
            : `Repeating task set up by ${setBy || "someone else"}. Only they (or a founder) can pause or delete it.`}
        </p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm flex items-center gap-2 min-w-0">
              <Repeat className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate">{repeatLabel(rule as any)}</span>
            </p>
            <Badge variant="outline" className={cn("shrink-0", rule.active ? "border-green-300 dark:border-green-500/40 text-green-700 dark:text-green-300" : "text-foreground/80")}>
              {rule.active ? "Active" : "Paused"}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="h-10 flex-1 gap-1"
              disabled={toggle.isPending}
              onClick={() => toggle.mutate({ id: rule.id, active: !rule.active })}
              data-testid="repeat-toggle"
            >
              {rule.active ? <><Pause className="h-4 w-4" />Pause</> : <><Play className="h-4 w-4" />Resume</>}
            </Button>
            {canDelete && (
              <Button variant="outline" className="h-10 flex-1 gap-1 text-destructive border-destructive/40" onClick={() => setConfirming(true)} data-testid="repeat-delete">
                <Trash2 className="h-4 w-4" />Delete for good
              </Button>
            )}
          </div>
          {confirming && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-2" data-testid="repeat-delete-confirm-box">
              <p className="text-sm">Delete "{rule.title}" for good? It stops for everyone, and its unfinished copies are removed. Finished copies stay in history. This can't be undone.</p>
              <div className="flex gap-2">
                <Button variant="outline" className="h-9 flex-1" onClick={() => setConfirming(false)}>Keep it</Button>
                <Button variant="destructive" className="h-9 flex-1" disabled={remove.isPending} onClick={() => { remove.mutate(rule.id); setConfirming(false); }} data-testid="repeat-stop-confirm">Delete for good</Button>
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">{rule.active ? "A new copy comes every day it repeats. Pause = stop for now (Resume later). Delete for good = never again." : "Paused: no new copies until resumed."}</p>
        </div>
      )}
    </div>
  );
}
