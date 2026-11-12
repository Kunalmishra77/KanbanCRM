import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Eye } from "lucide-react";
import { useOverview, type Health, type PersonRow } from "@/lib/overviewQueries";
import type { Period } from "@shared/istDate";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";

const PERIODS: { id: Period; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
];

const HEALTH: Record<Health, { label: string; dot: string; chip: string }> = {
  good: { label: "On track", dot: "bg-green-500", chip: "bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-500/40" },
  attention: { label: "Needs attention", dot: "bg-red-500", chip: "bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/40" },
  inactive: { label: "No activity", dot: "bg-amber-500", chip: "bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/40" },
  idle: { label: "No work assigned", dot: "bg-slate-400", chip: "bg-muted text-foreground/80 border-border" },
  away: { label: "On leave", dot: "bg-sky-500", chip: "bg-sky-50 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/40" },
};

const pct = (done: number, total: number) => (total > 0 ? Math.round((done / total) * 100) : null);

export function FounderOverview({ title = "Company overview" }: { title?: string }) {
  const [period, setPeriod] = useState<Period>("today");
  const [team, setTeam] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { data, isLoading, error } = useOverview(period, true);

  const valid = !!data && Array.isArray(data.people) && Array.isArray(data.teams);
  const summary = { pendingRequests: 0, otHours: 0, ...(data?.summary ?? {}) } as NonNullable<typeof data>["summary"];
  const away = summary.awayToday ?? { leave: [], wfh: [] };
  const people = useMemo(() => (valid && data ? data.people.filter((p) => !team || p.team === team) : []), [data, team]);

  return (
    <section className="space-y-4" data-testid="founder-overview">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {data && <p className="text-xs text-muted-foreground">{format(new Date(data.from), "d MMM")} – {format(new Date(new Date(data.to).getTime() - 1), "d MMM yyyy")}</p>}
        </div>
        <div className="inline-flex rounded-xl bg-black/5 dark:bg-white/10 p-1" role="tablist" aria-label="Period">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              role="tab"
              aria-selected={period === p.id}
              onClick={() => setPeriod(p.id)}
              data-testid={`period-${p.id}`}
              className={cn("min-h-[40px] px-3 sm:px-4 rounded-lg text-sm font-medium transition-colors", period === p.id ? "bg-white dark:bg-card shadow text-primary" : "text-muted-foreground")}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
      {(error || (data && !valid)) && <p className="text-sm text-red-600 dark:text-red-300">Could not load the overview{error ? `: ${(error as Error).message}` : "."}</p>}

      {data && valid && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 [&>*]:min-w-0" data-testid="overview-summary">
            {[
              { label: "People active", value: `${data.summary.peopleActive}/${data.summary.peopleWorking}`, tone: data.summary.peopleActive < data.summary.peopleWorking ? "text-amber-600 dark:text-amber-300" : "text-green-600 dark:text-green-300" },
              { label: "Planned stories done", value: `${data.summary.plannedDone}/${data.summary.planned}`, tone: "" },
              { label: "Completed", value: String(data.summary.completed), tone: "" },
              { label: "Overdue", value: String(data.summary.overdue), tone: data.summary.overdue ? "text-red-600 dark:text-red-300" : "" },
              { label: "Waiting for review", value: String(data.summary.waitingReview), tone: "" },
            ].map((t) => (
              <Card key={t.label} className="macos-card border-none">
                <CardContent className="p-3 sm:p-4">
                  <p className={cn("text-2xl font-bold leading-none", t.tone)}>{t.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {(summary.pendingRequests > 0 || away.leave.length > 0 || away.wfh.length > 0 || summary.otHours > 0) && (
            <div className="rounded-2xl border bg-white/70 dark:bg-white/[0.08] p-3 text-sm flex flex-wrap items-center gap-x-5 gap-y-2" data-testid="overview-services">
              {summary.pendingRequests > 0 && (
                <button className="font-semibold text-amber-700 dark:text-amber-300 underline min-h-[36px]" onClick={() => setLocation("/services")} data-testid="pending-requests-link">
                  {summary.pendingRequests} request{summary.pendingRequests === 1 ? "" : "s"} waiting for approval
                </button>
              )}
              {away.leave.length > 0 && <span><b>On leave today:</b> {away.leave.join(", ")}</span>}
              {away.wfh.length > 0 && <span><b>Working from home:</b> {away.wfh.join(", ")}</span>}
              {summary.otHours > 0 && <span><b>Overtime this period:</b> {summary.otHours} h</span>}
            </div>
          )}

          <div>
            <p className="text-sm font-semibold mb-2">Teams {team && <button className="ml-2 text-xs font-normal text-primary underline" onClick={() => setTeam(null)}>show all</button>}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 [&>*]:min-w-0" data-testid="overview-teams">
              {data.teams.map((t) => {
                const done = pct(t.plannedDone, t.planned);
                return (
                  <button key={t.team} onClick={() => setTeam(team === t.team ? null : t.team)} data-testid={`team-${t.team}`} className={cn("text-left rounded-2xl border bg-white/70 dark:bg-white/[0.08] p-4 transition-shadow hover:shadow-md min-h-[44px]", team === t.team && "ring-2 ring-primary")}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold truncate">{t.team}</span>
                      <span className={cn("inline-flex items-center gap-1.5 text-xs border rounded-full px-2 py-0.5 shrink-0", HEALTH[t.health].chip)}>
                        <span className={cn("h-2 w-2 rounded-full", HEALTH[t.health].dot)} />{HEALTH[t.health].label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{t.reason}</p>
                    <div className="mt-3 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden"><div className={cn("h-full", (done ?? 0) >= 50 ? "bg-green-500" : "bg-amber-500")} style={{ width: `${done ?? 0}%` }} /></div>
                    <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[11px] text-muted-foreground">
                      <span><b className="block text-sm text-foreground">{t.plannedDone}/{t.planned}</b>plan done</span>
                      <span><b className="block text-sm text-foreground">{t.active}/{t.people}</b>active</span>
                      <span><b className={cn("block text-sm", t.overdue ? "text-red-600 dark:text-red-300" : "text-foreground")}>{t.overdue}</b>overdue</span>
                      <span><b className="block text-sm text-foreground">{t.review}</b>review</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <Card className="macos-card border-none">
            <CardHeader className="pb-2"><CardTitle className="text-sm">People {team ? `· ${team}` : ""} ({people.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2" data-testid="overview-people">
              {people.map((p) => <PersonCard key={p.id} p={p} period={period} />)}
            </CardContent>
          </Card>

          <div className="grid gap-3 lg:grid-cols-2 [&>*]:min-w-0">
            <Card className="macos-card border-none" data-testid="overview-review">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Eye className="h-4 w-4 text-primary" /> Waiting for review ({data.review.length})</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {data.review.length === 0 && <p className="text-sm text-muted-foreground">Nothing is waiting for review.</p>}
                {data.review.slice(0, 10).map((r) => (
                  <button key={r.storyId} onClick={() => setLocation(`/clients/${r.clientId}`)} className="w-full text-left rounded-lg px-2 py-2 hover:bg-black/5 dark:hover:bg-white/10 min-h-[44px]">
                    <span className="block text-sm font-medium truncate">{r.title}</span>
                    <span className="block text-xs text-muted-foreground truncate">{r.assignee} · {r.client} · waiting {r.waitingDays === 0 ? "since today" : `${r.waitingDays} day${r.waitingDays === 1 ? "" : "s"}`}</span>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="macos-card border-none" data-testid="overview-comments">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Latest comments ({data.summary.comments})</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {data.recentComments.length === 0 && <p className="text-sm text-muted-foreground">No comments in this period.</p>}
                {data.recentComments.slice(0, 10).map((c) => (
                  <button key={c.id} onClick={() => setLocation(`/clients/${c.clientId}`)} className="w-full text-left rounded-lg px-2 py-2 hover:bg-black/5 dark:hover:bg-white/10 min-h-[44px]">
                    <span className="block text-sm break-words"><b>{c.author}</b>: {c.body}</span>
                    <span className="block text-xs text-muted-foreground truncate">{c.client} · {c.storyTitle} · {formatDistanceToNow(new Date(c.at), { addSuffix: true })}</span>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </section>
  );
}

function PersonCard({ p, period }: { p: PersonRow; period: Period }) {
  const h = HEALTH[p.health];
  const [, setLocation] = useLocation();
  const board = (scope?: string) => `/global-kanban?assignee=${encodeURIComponent(p.name)}${scope ? `&scope=${scope}` : ""}`;
  const stats: { key: string; value: React.ReactNode; label: string; to: string; hint: string; red?: boolean }[] = [
    { key: "done", value: p.completed, label: `done ${period === "today" ? "today" : "in period"}`, to: board("done"), hint: "Show finished stories" },
    { key: "plan", value: `${p.plannedDone}/${p.planned}`, label: "plan done", to: board(), hint: "Show all of their stories" },
    { key: "open", value: p.open, label: "open", to: board("open"), hint: "Show open stories" },
    { key: "overdue", value: p.overdue, label: "overdue", to: board("overdue"), hint: "Show overdue stories", red: p.overdue > 0 },
    { key: "comments", value: p.comments, label: "comments", to: `/audit-log?user=${encodeURIComponent(p.id)}&type=comment`, hint: "Show their comments" },
    { key: "updates", value: p.actions, label: "updates", to: `/audit-log?user=${encodeURIComponent(p.id)}`, hint: "Show everything they did" },
  ];
  return (
    <div className="rounded-xl border bg-white/60 dark:bg-white/[0.08] p-3" data-testid={`person-${p.name}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold truncate">{p.name}</p>
          <p className="text-xs text-muted-foreground truncate">{p.team}</p>
        </div>
        <span className={cn("inline-flex items-center gap-1.5 text-xs border rounded-full px-2 py-0.5 shrink-0", h.chip)}>
          <span className={cn("h-2 w-2 rounded-full", h.dot)} />{h.label}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{p.reason}</p>
      <div className="mt-2 grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-[11px] text-muted-foreground">
        {stats.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setLocation(s.to)}
            title={s.hint}
            aria-label={`${s.value} ${s.label}. ${s.hint}`}
            data-testid={`stat-${s.key}-${p.name}`}
            className="rounded-lg py-1.5 min-h-[44px] hover:bg-black/5 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
          >
            <b className={cn("block text-sm", s.red ? "text-red-600 dark:text-red-300" : "text-foreground")}>{s.value}</b>{s.label}
          </button>
        ))}
      </div>
      {(p.away === "wfh" || p.otHours > 0) && (
        <p className="text-[11px] mt-1 text-sky-700 dark:text-sky-300">{p.away === "wfh" ? "Working from home today" : ""}{p.away === "wfh" && p.otHours > 0 ? " · " : ""}{p.otHours > 0 ? `${p.otHours} h overtime` : ""}</p>
      )}
      <p className="text-[11px] text-muted-foreground mt-2">Last active: {p.lastActiveAt ? formatDistanceToNow(new Date(p.lastActiveAt), { addSuffix: true }) : "no activity in the last 35 days"}</p>
    </div>
  );
}
