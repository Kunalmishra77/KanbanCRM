import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Pause, Play, Trash2, Repeat } from "lucide-react";
import { useIsFounder } from "@/lib/auth";
import { useClients, useUsers } from "@/lib/queries";
import { useRecurringTasks, useToggleRecurringTask, useDeleteRecurringTask } from "@/lib/serviceQueries";
import { CreateStoryModal } from "@/components/CreateStoryModal";
import { RestrictedNotice } from "@/components/RestrictedNotice";
import { fullName } from "@/lib/assignee";
import { WEEKDAYS } from "@shared/schedule";
import { cn } from "@/lib/utils";
import type { RecurringTask } from "@shared/schema";

const when = (t: RecurringTask) =>
  t.repeat === "daily" ? "Every working day" : t.repeat === "weekly" ? `Every ${WEEKDAYS[t.weekday ?? 1]}` : `Monthly on day ${t.monthDay}`;

export default function RecurringTasks() {
  const isFounder = useIsFounder();
  const { data: tasks = [], isLoading } = useRecurringTasks(isFounder);
  const { data: clients = [] } = useClients();
  const { data: users = [] } = useUsers();
  const toggle = useToggleRecurringTask();
  const remove = useDeleteRecurringTask();
  const [adding, setAdding] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);

  if (!isFounder) return <RestrictedNotice message="Repeating tasks are managed by founders." />;

  const clientName = (id: string) => (clients as any[]).find((c) => c.id === id)?.name || "Client";
  const who = (t: RecurringTask) =>
    t.team ? `Everyone in ${t.team}${(t.excludeIds || []).length ? ` except ${(t.excludeIds || []).map((id) => fullName((users as any[]).find((u) => u.id === id)) || "someone").join(", ")}` : ""}` : t.assigneeIds.map((id) => fullName((users as any[]).find((u) => u.id === id)) || "Unknown").join(", ");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Repeating tasks</h1>
          <p className="text-muted-foreground">Set a task once. A fresh story is created for each person on every working day, week or month.</p>
        </div>
        <Button className="h-11 gap-2" onClick={() => setAdding(true)} data-testid="add-repeating"><Plus className="h-4 w-4" />New task</Button>
      </div>

      {isLoading && <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
      {!isLoading && tasks.length === 0 && (
        <p className="text-center text-muted-foreground py-12">No repeating tasks yet. Tap "New task" and choose how often it repeats.</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 [&>*]:min-w-0">
        {(tasks as RecurringTask[]).map((t) => (
          <Card key={t.id} className={cn("macos-card border-none", !t.active && "opacity-70")} data-testid={`rule-${t.title}`}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold break-words flex items-center gap-2"><Repeat className="h-4 w-4 text-primary shrink-0" />{t.title}</p>
                  <p className="text-xs text-muted-foreground">{clientName(t.clientId)}</p>
                </div>
                <Badge variant="outline" className={cn("shrink-0", t.active ? "border-green-300 dark:border-green-500/40 text-green-700 dark:text-green-300" : "border-border text-foreground/80")}>{t.active ? "Active" : "Paused"}</Badge>
              </div>
              <div className="text-sm space-y-0.5">
                <p>{when(t)} · due {t.dueTime ? `${t.dueTime} India time` : "end of day"}</p>
                <p className="text-muted-foreground break-words">For: {who(t)}</p>
              </div>
              {t.description && <p className="text-xs text-muted-foreground whitespace-pre-line line-clamp-3">{t.description}</p>}
              <div className="flex gap-2">
                <Button variant="outline" className="h-10 flex-1 gap-1" disabled={toggle.isPending} onClick={() => toggle.mutate({ id: t.id, active: !t.active })}>
                  {t.active ? <><Pause className="h-4 w-4" />Pause</> : <><Play className="h-4 w-4" />Resume</>}
                </Button>
                {confirming === t.id ? (
                  <Button variant="destructive" className="h-10 flex-1" onClick={() => { remove.mutate(t.id); setConfirming(null); }} data-testid={`confirm-delete-${t.title}`}>Confirm delete</Button>
                ) : (
                  <Button variant="outline" className="h-10 w-12 text-destructive" aria-label={`Delete ${t.title}`} onClick={() => setConfirming(t.id)}><Trash2 className="h-4 w-4" /></Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <CreateStoryModal open={adding} onOpenChange={setAdding} />
    </div>
  );
}
