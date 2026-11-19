import { useMemo } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CalendarClock, CheckCircle2, Flame, Sun, Snowflake, Inbox, Send, KanbanSquare, Eye, UserCheck } from "lucide-react";
import { inBoard, isWaiting } from "@/lib/boards";
import { MentionInbox } from "@/components/MentionInbox";
import { useAuth } from "@/lib/auth";
import { isAssignedTo } from "@/lib/assignee";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Client, Story } from "@shared/schema";

const DAY_MS = 24 * 60 * 60 * 1000;

const TEMPS = [
  { stage: "Hot", icon: Flame, tone: "text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-500/20 border-red-200 dark:border-red-500/40" },
  { stage: "Warm", icon: Sun, tone: "text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/20 border-amber-200 dark:border-amber-500/40" },
  { stage: "Cold", icon: Snowflake, tone: "text-sky-600 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/20 border-sky-200 dark:border-sky-500/40" },
] as const;

/**
 * The signed-in person's own workload: what is assigned to them, how urgent it is, and how many
 * of those stories sit on Hot / Warm / Cold clients. Shown first on the dashboard so nobody has
 * to open the global board and filter.
 */
export function MyWork({ stories, clients }: { stories: Story[]; clients: Client[] }) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const stats = useMemo(() => {
    const mine = stories.filter((s) => isAssignedTo(s, user));
    const open = mine.filter((s) => s.status !== "Done");
    const stageOf = new Map(clients.map((c) => [c.id, c.stage]));
    const now = Date.now();

    const overdue = open.filter((s) => new Date(s.dueDate).getTime() < now);
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = dayStart.getTime() + DAY_MS;
    const dueToday = open.filter((s) => { const d = new Date(s.dueDate).getTime(); return d >= now && d < dayEnd; });
    const doneToday = mine.filter((s) => s.status === "Done" && new Date(s.updatedAt as any).getTime() >= dayStart.getTime());
    const waiting = stories.filter((s) => isWaiting(s, user as any));
    const openIn = (b: "mine" | "assigned" | "given") => stories.filter((s) => inBoard(s, b, user as any) && s.status !== "Done");
    const boards = {
      mine: openIn("mine").length,
      assigned: openIn("assigned").length,
      given: openIn("given").length,
      givenNotAccepted: stories.filter((s) => inBoard(s, "given", user as any) && !(s as any).acceptedAt).length,
    };
    // Work I gave to others: how it is going
    const given = stories.filter((s) => inBoard(s, "given", user as any));
    const givenOpen = given.filter((s) => s.status !== "Done");
    const delegated = {
      open: givenOpen.length,
      notAccepted: givenOpen.filter((s) => !(s as any).acceptedAt).length,
      late: givenOpen.filter((s) => !s.recurringTaskId && new Date(s.dueDate).getTime() < now).length,
      missed: givenOpen.filter((s) => !!s.recurringTaskId && new Date(s.dueDate).getTime() < now).length,
      review: givenOpen.filter((s) => s.status === "Review").length,
      doneToday: given.filter((s) => s.status === "Done" && new Date(s.updatedAt as any).getTime() >= dayStart.getTime()).length,
    };
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

    return { delegated, overdue: overdue.length, dueToday: dueToday.length, doneToday: doneToday.length, waiting: waiting.length, boards, byTemp, upNext, stageOf, clientsByTemp, myClients: myClients.length, dayStart: dayStart.toISOString() };
  }, [stories, clients, user]);

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "Client";

  // Every number opens the stories behind it on the Global Board (mine=1: always the person's own)
  const mineBoard = (q = "") => `/global-kanban?mine=1${q ? "&" + q : ""}`;
  // Today: the four things to look at first. Each opens exactly those stories.
  const tiles = [
    { key: "waiting", label: "Waiting for you", value: stats.waiting, sub: stats.waiting ? "accept when ready" : "nothing new", icon: Inbox, tone: "bg-primary/10 text-primary", to: "/global-kanban?board=assigned" },
    { key: "today", label: "Due today", value: stats.dueToday, sub: "finish today", icon: CalendarClock, tone: "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300", to: mineBoard("due=today") },
    { key: "overdue", label: "Overdue", value: stats.overdue, sub: stats.overdue ? "need attention" : "all on time", icon: AlertTriangle, tone: "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-300", to: mineBoard("scope=overdue") },
    { key: "done", label: "Done today", value: stats.doneToday, sub: "well done", icon: CheckCircle2, tone: "bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-300", to: mineBoard(`scope=completed&from=${encodeURIComponent(stats.dayStart)}`) },
  ];
  // My three boards, with how much is open on each
  const boardTiles = [
    { key: "board-mine", label: "Mine", value: stats.boards.mine, sub: "open · everything I committed to", icon: KanbanSquare, to: "/global-kanban?board=mine" },
    { key: "board-assigned", label: "Assigned to me", value: stats.waiting, sub: stats.waiting ? "new · accept or decline" : "nothing new", icon: Inbox, to: "/global-kanban?board=assigned" },
    { key: "board-given", label: "Assigned by me", value: stats.boards.given, sub: stats.boards.givenNotAccepted ? `open · ${stats.boards.givenNotAccepted} not accepted yet` : "open · I gave to others", icon: Send, to: "/global-kanban?board=given" },
  ];

  // People who mostly hand out work (founders, managers) see "Work I gave out" first
  const d = stats.delegated;
  const delegatesMost = d.open > 0 && d.open >= stats.boards.mine + stats.boards.assigned;
  const givenBoard = (q: string) => `/global-kanban?board=given${q ? "&" + q : ""}`;
  const delegatedBlock = d.open + d.doneToday > 0 && (
    <Card className="macos-card border-none" data-testid="work-given-out">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Send className="h-4 w-4 text-primary" />Work I gave out</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 p-3 pt-0 sm:p-6 sm:pt-0">
        {[
          { key: "open", label: "open", value: d.open, to: givenBoard(""), tone: "text-foreground", icon: KanbanSquare },
          { key: "unaccepted", label: "not accepted yet", value: d.notAccepted, to: givenBoard("scope=unaccepted"), tone: d.notAccepted ? "text-amber-600 dark:text-amber-300" : "text-muted-foreground", icon: UserCheck },
          { key: "late", label: "late", value: d.late, to: givenBoard("scope=late"), tone: d.late ? "text-red-600 dark:text-red-300" : "text-muted-foreground", icon: AlertTriangle },
          { key: "missed", label: "routines missed", value: d.missed, to: givenBoard("scope=missed"), tone: d.missed ? "text-orange-600 dark:text-orange-300" : "text-muted-foreground", icon: AlertTriangle },
          { key: "review", label: "for my review", value: d.review, to: givenBoard("scope=review"), tone: d.review ? "text-violet-600 dark:text-violet-300" : "text-muted-foreground", icon: Eye },
          { key: "done", label: "done today", value: d.doneToday, to: givenBoard(`scope=completed&from=${encodeURIComponent(stats.dayStart)}`), tone: d.doneToday ? "text-green-600 dark:text-green-300" : "text-muted-foreground", icon: CheckCircle2 },
        ].map((t) => (
          <button key={t.key} type="button" onClick={() => setLocation(t.to)} data-testid={`given-${t.key}`}
            className="text-left rounded-xl border bg-white/60 dark:bg-white/[0.05] p-3 hover:shadow-sm transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-w-0">
            <p className={cn("text-2xl font-bold leading-none tabular-nums", t.tone)}>{t.value}</p>
            <p className="text-xs text-muted-foreground mt-1 truncate">{t.label}</p>
          </button>
        ))}
      </CardContent>
    </Card>
  );

  return (
    <section className="space-y-3" data-testid="my-work">
      <h2 className="text-lg font-semibold tracking-tight">My day</h2>

      {delegatesMost && delegatedBlock}


      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 [&>*]:min-w-0">
        {tiles.map((t) => (
          <button key={t.label} type="button" onClick={() => setLocation(t.to)} data-testid={`mywork-${t.key}`} title={`Show: ${t.label}`}
            className="text-left rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <Card className="macos-card border-none h-full transition-shadow hover:shadow-md cursor-pointer">
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
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 [&>*]:min-w-0" data-testid="my-boards">
        {boardTiles.map((t) => (
          <button key={t.key} type="button" onClick={() => setLocation(t.to)} data-testid={`mywork-${t.key}`} title={`Open ${t.label}`}
            className="text-left rounded-2xl border bg-white/70 dark:bg-white/[0.08] p-3 sm:p-4 flex items-center gap-3 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-w-0">
            <t.icon className="h-5 w-5 text-muted-foreground shrink-0" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{t.label} <span className="text-primary">{t.value}</span></span>
              <span className="block text-xs text-muted-foreground truncate">{t.sub}</span>
            </span>
          </button>
        ))}
      </div>

      <MentionInbox />

      {!delegatesMost && delegatedBlock}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 [&>*]:min-w-0">
        <Card className="macos-card border-none">
          <CardHeader className="pb-2"><CardTitle className="text-sm">My open stories by client temperature</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-3 gap-2 p-3 pt-0 sm:p-6 sm:pt-0">
            {TEMPS.map(({ stage, icon: Icon, tone }) => (
              <button key={stage} type="button" onClick={() => setLocation(mineBoard(`scope=open&stage=${stage}`))} title={`Show my open stories for ${stage} clients`} className={cn("rounded-xl border p-2 sm:p-3 text-center min-w-0 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", tone)} data-testid={`my-temp-${stage}`}>
                <Icon className="h-4 w-4 mx-auto mb-1" />
                <p className="text-2xl font-bold leading-none">{stats.byTemp[stage]}</p>
                <p className="text-xs mt-1">{stage}</p>
                <p className="text-[10px] opacity-70 leading-tight">{stats.clientsByTemp[stage]} my client{stats.clientsByTemp[stage] === 1 ? "" : "s"}</p>
              </button>
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
                  onClick={() => setLocation(`/global-kanban?story=${s.id}`)}
                  className="w-full min-w-0 flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-black/5 dark:hover:bg-white/10 min-h-[44px]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium truncate">{s.title}</span>
                    <span className="block text-xs text-muted-foreground truncate">{clientName(s.clientId)}</span>
                  </span>
                  <span className={cn("text-xs shrink-0", late ? "text-red-600 dark:text-red-300 font-semibold" : "text-muted-foreground")}>
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
