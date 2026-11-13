import { useState } from "react";
import { Pause, Play, Repeat, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRecurringTasks, useToggleRecurringTask, useDeleteRecurringTask } from "@/lib/serviceQueries";
import { repeatLabel } from "@shared/schedule";

/**
 * Shown in a story that came from a repeating task: how often it repeats, and Pause / Resume /
 * Stop repeating for whoever may manage that repeating task (its creator, founders, the chief of staff).
 * Pausing or stopping never removes stories that already exist.
 */
export function RepeatControls({ ruleId }: { ruleId: string }) {
  const { data: rules = [], isLoading } = useRecurringTasks(true);
  const toggle = useToggleRecurringTask();
  const remove = useDeleteRecurringTask();
  const [confirming, setConfirming] = useState(false);
  const rule = rules.find((r) => r.id === ruleId);

  return (
    <div data-testid="repeat-controls">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Repeats</h4>
      {isLoading ? null : !rule ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Repeat className="h-4 w-4 text-primary shrink-0" />
          Repeating task (managed by the person who set it up)
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
            {confirming ? (
              <Button variant="destructive" className="h-10 flex-1" onClick={() => { remove.mutate(rule.id); setConfirming(false); }} data-testid="repeat-stop-confirm">
                Stop repeating
              </Button>
            ) : (
              <Button variant="outline" className="h-10 w-12 text-destructive" aria-label="Stop repeating" title="Stop repeating" onClick={() => setConfirming(true)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{rule.active ? "Pausing stops new copies; this story stays." : "Paused: no new copies until resumed."}</p>
        </div>
      )}
    </div>
  );
}
