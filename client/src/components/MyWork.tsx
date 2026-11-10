import { useMemo } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListTodo, AlertTriangle, CalendarClock, CheckCircle2, Flame, Sun, Snowflake, AtSign } from "lucide-react";
import { useMentions } from "@/lib/overviewQueries";
import { MentionText } from "@/components/MentionTextarea";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/lib/auth";
import { isAssignedTo } from "@/lib/assignee";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Client, Story } from "@shared/schema";

const DAY_MS = 24 * 60 * 60 * 1000;
const STATUSES = ["To Do", "In Progress", "Blocked", "Review", "Done"] as const;

const TEMPS = [
  { stage: "Hot", icon: Flame, tone: "text-red-600 bg-red-50 border-red-200" },
  { stage: "Warm", icon: Sun, tone: "text-amber-600 bg-amber-50 border-amber-200" },
  { stage: "Cold", icon: Snowflake, tone: "text-sky-600 bg-sky-50 border-sky-200" },
] as const;

/**
 * The signed-in person's own workload: what is assigned to them, how urgent it is, and how many
 * of those stories sit on Hot / Warm / Cold clients. Shown first on the dashboard so nobody has
 * to open the global board and filter.
 */
export function MyWork({ stories, clients }: { stories: Story[]; clients: Client[] }) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: mentions = [] } = useMentions();

  const stats = useMemo(() => {
    const mine = stories.filter((s) => isAssignedTo(s, user));
    const open = mine.filter((s) => s.status !== "Done");
    const stageOf = new Map(clients.map((c) => [c.id, c.stage]));
    const now = Date.now();

    const overdue = open.filter((s) => new Date(s.dueDate).getTime() < now);
    const dueSoon = open.filter((s) => {
      const d = new Date(s.dueDate).getTime() - now;
      return d >= 0 && d <= 7 * DAY_MS;
    });
    const byStatus = Object.fromEntries(STATUSES.map((st) => [st, mine.filter((s) => s.status === st).length]));
    const byTemp = Object.fromEntries(
      TEMPS.map(({ stage }) => [stage, open.filter((s) => stageOf.get(s.clientId) === stage).length]),
    );
    const upNext = [...open]
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 6);
    const myClients = clients.filter((c) => c.ownerId === user?.id);
    const clientsByTemp = Object.fromEntries(
      TEMPS.map(({ stage }) => [stage, myClients.filter((c) => c.stage === stage).length]),
    );

    return { total: mine.length, open: open.length, overdue: overdue.length, dueSoon: dueSoon.length, byStatus, byTemp, upNext, stageOf, clientsByTemp, myClients: myClients.length };
  }, [stories, clients, user]);

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "Client";

  const tiles = [
    { label: "Assigned to me", value: stats.total, sub: `${stats.open} open`, icon: ListTodo, tone: "bg-primary/10 text-primary" },
    { label: "Overdue", value: stats.overdue, sub: "need attention", icon: AlertTriangle, tone: "bg-red-100 text-red-600" },
    { label: "Due in 7 days", value: stats.dueSoon, sub: "coming up", icon: CalendarClock, tone: "bg-amber-100 text-amber-600" },
    { label: "Completed", value: stats.byStatus["Done"], sub: "done", icon: CheckCircle2, tone: "bg-green-100 text-green-600" },
  ];

  return (
    <section className="space-y-3" data-testid="my-work">
      <h2 className="text-lg font-semibold tracking-tight">My work</h2>

      {mentions.length > 0 && (
        <Card className="macos-card border-none border-l-4 !border-l-primary" data-testid="mentions-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AtSign className="h-4 w-4 text-primary" /> Mentioned you ({mentions.length})</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {mentions.slice(0, 8).map((m) => (
              <button key={m.id} type="button" onClick={() => setLocation(`/clients/${m.clientId}`)} className="w-full min-w-0 text-left rounded-lg px-2 py-2 hover:bg-black/5 min-h-[44px]">
                <span className="block text-sm break-words"><b>{m.authorName || "Someone"}</b>: <MentionText body={m.body} /></span>
                <span className="block text-xs text-muted-foreground truncate">{m.storyTitle} · {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 [&>*]:min-w-0">
        {tiles.map((t) => (
          <Card key={t.label} className="macos-card border-none">
            <CardContent className="p-3 sm:p-4 flex items-center gap-3">
              <div className={cn("p-2.5 rounded-xl shrink-0", t.tone)}>
                <t.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold leading-none">{t.value}</p>
                <p className="text-xs font-medium mt-1 leading-tight">{t.label}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">{t.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 [&>*]:min-w-0">
        <Card className="macos-card border-none">
          <CardHeader className="pb-2"><CardTitle className="text-sm">My open stories by client temperature</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-3 gap-2 p-3 pt-0 sm:p-6 sm:pt-0">
            {TEMPS.map(({ stage, icon: Icon, tone }) => (
              <div key={stage} className={cn("rounded-xl border p-2 sm:p-3 text-center min-w-0", tone)} data-testid={`my-temp-${stage}`}>
                <Icon className="h-4 w-4 mx-auto mb-1" />
                <p className="text-2xl font-bold leading-none">{stats.byTemp[stage]}</p>
                <p className="text-xs mt-1">{stage}</p>
                <p className="text-[10px] opacity-70 leading-tight">{stats.clientsByTemp[stage]} my client{stats.clientsByTemp[stage] === 1 ? "" : "s"}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="macos-card border-none">
          <CardHeader className="pb-2"><CardTitle className="text-sm">By status</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {STATUSES.map((st) => (
              <Badge key={st} variant="secondary" className="text-xs font-medium">
                {st}: {stats.byStatus[st]}
              </Badge>
            ))}
          </CardContent>
        </Card>

        <Card className="macos-card border-none">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Up next</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {stats.upNext.length === 0 && <p className="text-sm text-muted-foreground">Nothing open. You're all caught up.</p>}
            {stats.upNext.map((s) => {
              const late = new Date(s.dueDate).getTime() < Date.now();
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setLocation(`/clients/${s.clientId}`)}
                  className="w-full min-w-0 flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-black/5 min-h-[44px]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium truncate">{s.title}</span>
                    <span className="block text-xs text-muted-foreground truncate">{clientName(s.clientId)}</span>
                  </span>
                  <span className={cn("text-xs shrink-0", late ? "text-red-600 font-semibold" : "text-muted-foreground")}>
                    {format(new Date(s.dueDate), "d MMM")}
                  </span>
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
