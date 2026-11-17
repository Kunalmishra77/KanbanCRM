import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, AlertTriangle, Ban, UserX, CalendarClock, CheckCircle2, MessageSquare } from "lucide-react";
import { useOverview, type Health, type PersonRow } from "@/lib/overviewQueries";
import type { Period } from "@shared/istDate";
import type { Story, Client } from "@shared/schema";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format, differenceInCalendarDays } from "date-fns";

const PERIODS: { id: Period; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
];

const HEALTH: Record<Health, { label: string; dot: string; chip: string }> = {
  good: { label: "On track", dot: "bg-green-500", chip: "bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-500/40" },
  attention: { label: "Needs attention", dot: "bg-red-500", chip: "bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/40" },
  inactive: { label: "No update", dot: "bg-amber-500", chip: "bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/40" },
  idle: { label: "No work", dot: "bg-slate-400", chip: "bg-muted text-foreground/80 border-border" },
  away: { label: "On leave", dot: "bg-sky-500", chip: "bg-sky-50 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/40" },
};

function Chip({ health }: { health: Health }) {
  const h = HEALTH[health];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] border rounded-full px-2 py-0.5 shrink-0 whitespace-nowrap", h.chip)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", h.dot)} />{h.label}
    </span>
  );
}

/** A fixed-height placeholder so the page doesn't jump while the numbers load. */
function Placeholder({ h }: { h: string }) {
  return <div className={cn("rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] animate-pulse", h)} />;
}

/**
 * Team view of the dashboard (founders and chief of staff: everyone; a team lead: her team).
 * Order: what needs attention -> the numbers -> teams -> people -> stuck work -> review and comments.
 */
export function FounderOverview({ title = "Company overview", stories = [], clients = [] }: { title?: string; stories?: Story[]; clients?: Client[] }) {
  const [period, setPeriod] = useState<Period>("today");
  const [team, setTeam] = useState<string | null>(null);
  const [onlyNoUpdate, setOnlyNoUpdate] = useState(false);
  const [activeOnly, setActiveOnly] = useState(false);
  const [showAllStuck, setShowAllStuck] = useState(false);
  const [, setLocation] = useLocation();
  const { data, isLoading, error } = useOverview(period, true);
  const valid = !!data && Array.isArray(data.people) && Array.isArray(data.teams);
  const go = (q: string) => setLocation(`/global-kanban?${q}`);

  const peopleIds = useMemo(() => new Set((data?.people || []).map((p) => p.id)), [data]);
  // Overdue + blocked, once, oldest problem first (only the people this overview covers)
  const stuck = useMemo(() => {
    const now = Date.now();
    return stories
      .filter((s) => s.status !== "Done" && s.assignedTo && peopleIds.has(s.assignedTo))
      .map((s) => {
        const overdue = !!s.dueDate && new Date(s.dueDate).getTime() < now;
        const blocked = s.status === "Blocked";
        const since = blocked ? new Date(s.updatedAt as any) : new Date(s.dueDate);
        return { s, overdue, blocked, days: Math.max(0, differenceInCalendarDays(new Date(), since)) };
      })
      .filter((x) => x.overdue || x.blocked)
      .sort((a, b) => b.days - a.days);
  }, [stories, peopleIds]);
  const blockedCount = stuck.filter((x) => x.blocked).length;
  const clientName = (id: string) => clients.find((c) => c.id === id)?.name || "";
  const personName = (id?: string | null) => data?.people.find((p) => p.id === id)?.name || "";

  const visibleTeams = (data?.teams || []).filter((t) => t.team !== "No team set" || t.planned > 0 || t.completed > 0 || t.overdue > 0);
  const allPeople = valid && data ? data.people : [];
  const noUpdate = allPeople.filter((p) => p.health === "inactive" || (p.health === "attention" && p.comments + p.actions === 0));
  const idle = allPeople.filter((p) => p.health === "idle");
  const people = allPeople.filter((p) => p.health !== "idle"
    && (!team || p.team === team)
    && (!onlyNoUpdate || noUpdate.includes(p))
    && (!activeOnly || p.comments + p.actions > 0));
  const periodWord = period === "today" ? "today" : period === "week" ? "this week" : "this month";

  return (
    <section className="space-y-4" data-testid="founder-overview">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <p className="text-xs text-muted-foreground min-h-[16px]">{data ? `${format(new Date(data.from), "d MMM")} – ${format(new Date(new Date(data.to).getTime() - 1), "d MMM yyyy")}` : ""}</p>
        </div>
        <div className="inline-flex rounded-xl bg-black/5 dark:bg-white/10 p-1" role="tablist" aria-label="Period">
          {PERIODS.map((p) => (
            <button key={p.id} role="tab" aria-selected={period === p.id} onClick={() => setPeriod(p.id)} data-testid={`period-${p.id}`}
              className={cn("min-h-[36px] px-3 sm:px-4 rounded-lg text-sm font-medium transition-colors", period === p.id ? "bg-white dark:bg-card shadow text-primary" : "text-muted-foreground")}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {(error || (data && !valid)) && <p className="text-sm text-red-600 dark:text-red-300">Could not load the overview{error ? `: ${(error as Error).message}` : "."}</p>}

      {!valid && !error && (
        <div className="space-y-3" aria-busy={isLoading}>
          <Placeholder h="h-[72px]" /><Placeholder h="h-[88px]" /><Placeholder h="h-[320px]" />
        </div>
      )}

      {data && valid && (
        <>
          {/* 1. Needs attention: only what needs someone to act */}
          <div className="rounded-2xl border bg-white/70 dark:bg-white/[0.06] p-3" data-testid="needs-attention">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Needs attention</p>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "overdue", n: data.summary.overdue, label: "overdue", icon: AlertTriangle, tone: "text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-500/15 border-red-200 dark:border-red-500/30", go: () => go("scope=overdue") },
                { key: "blocked", n: blockedCount, label: "blocked", icon: Ban, tone: "text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-500/15 border-orange-200 dark:border-orange-500/30", go: () => go("board=all&status=Blocked") },
                { key: "review", n: data.summary.waitingReview, label: "waiting for review", icon: Eye, tone: "text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-500/15 border-violet-200 dark:border-violet-500/30", go: () => go("scope=review") },
                { key: "noupdate", n: noUpdate.length, label: `${noUpdate.length === 1 ? "person" : "people"} with no update ${periodWord}`, icon: UserX, tone: "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/30", go: () => { setOnlyNoUpdate(true); setActiveOnly(false); document.querySelector('[data-testid="overview-people"]')?.scrollIntoView({ behavior: "smooth", block: "start" }); } },
                { key: "requests", n: data.summary.pendingRequests || 0, label: "leave / WFH requests to approve", icon: CalendarClock, tone: "text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/15 border-sky-200 dark:border-sky-500/30", go: () => setLocation("/services") },
              ].filter((x) => x.n > 0).map((x) => (
                <button key={x.key} type="button" onClick={x.go} data-testid={`summary-${x.key}`}
                  className={cn("inline-flex items-center gap-2 rounded-xl border px-3 h-10 text-sm font-medium hover:shadow-sm transition-shadow", x.tone)}>
                  <x.icon className="h-4 w-4" /><b className="text-base">{x.n}</b> {x.label}
                </button>
              ))}
              {data.summary.overdue === 0 && blockedCount === 0 && data.summary.waitingReview === 0 && noUpdate.length === 0 && !data.summary.pendingRequests && (
                <span className="inline-flex items-center gap-2 text-sm text-green-700 dark:text-green-300"><CheckCircle2 className="h-4 w-4" />All good: nothing overdue, blocked or waiting.</span>
              )}
            </div>
            {(data.summary.awayToday?.leave?.length > 0 || data.summary.awayToday?.wfh?.length > 0) && (
              <p className="text-xs text-muted-foreground mt-2">
                {data.summary.awayToday.leave.length > 0 && <><b>On leave today:</b> {data.summary.awayToday.leave.join(", ")}. </>}
                {data.summary.awayToday.wfh.length > 0 && <><b>Working from home:</b> {data.summary.awayToday.wfh.join(", ")}.</>}
              </p>
            )}
          </div>

          {/* 2. The numbers for the period */}
          <div className="grid grid-cols-3 gap-3 [&>*]:min-w-0" data-testid="overview-summary">
            {[
              { key: "active", value: `${data.summary.peopleActive}/${data.summary.peopleWorking}`, label: `people updated ${periodWord}`, go: () => { setActiveOnly(true); setOnlyNoUpdate(false); document.querySelector('[data-testid="overview-people"]')?.scrollIntoView({ behavior: "smooth", block: "start" }); } },
              { key: "planned", value: `${data.summary.plannedDone}/${data.summary.planned}`, label: `due ${periodWord}: done`, go: () => go(`scope=planned&from=${encodeURIComponent(data.from)}&to=${encodeURIComponent(data.to)}`) },
              { key: "completed", value: String(data.summary.completed), label: `finished ${periodWord}`, go: () => go(`scope=completed&from=${encodeURIComponent(data.from)}&to=${encodeURIComponent(data.to)}`) },
            ].map((t) => (
              <button key={t.key} type="button" onClick={t.go} data-testid={`summary-${t.key}`}
                className="text-left rounded-2xl border bg-white/70 dark:bg-white/[0.06] p-3 sm:p-4 hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <p className="text-2xl font-bold leading-none">{t.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{t.label}</p>
              </button>
            ))}
          </div>

          {/* 3. Teams: one row each */}
          {visibleTeams.length > 1 && (
            <Card className="macos-card border-none">
              <CardHeader className="pb-1"><CardTitle className="text-sm">Teams {team && <button className="ml-2 text-xs font-normal text-primary underline" onClick={() => setTeam(null)}>show all people</button>}</CardTitle></CardHeader>
              <CardContent className="p-2 sm:p-3 pt-0" data-testid="overview-teams">
                <div className="hidden sm:grid grid-cols-[1.4fr_1fr_repeat(4,0.7fr)] gap-2 px-2 py-1 text-[11px] text-muted-foreground">
                  <span>Team</span><span>Status</span><span className="text-center">Updated</span><span className="text-center">Due done</span><span className="text-center">Finished</span><span className="text-center">Overdue</span>
                </div>
                {visibleTeams.map((t) => (
                  <div key={t.team} className={cn("grid grid-cols-[1fr_auto] sm:grid-cols-[1.4fr_1fr_repeat(4,0.7fr)] items-center gap-2 rounded-xl px-2 py-2 hover:bg-black/[0.03] dark:hover:bg-white/[0.05]", team === t.team && "bg-primary/5 ring-1 ring-primary/40")}>
                    <button type="button" onClick={() => setTeam(team === t.team ? null : t.team)} className="text-left font-medium truncate min-h-[32px]" title="Show only this team's people below">{t.team}</button>
                    <span className="justify-self-end sm:justify-self-start"><Chip health={t.health} /></span>
                    <span className="hidden sm:block text-center text-sm">{t.active}/{t.people}</span>
                    <button type="button" data-testid={`team-${t.team}`} onClick={() => setLocation(`/global-kanban?team=${encodeURIComponent(t.team)}`)} className="hidden sm:block text-center text-sm underline-offset-2 hover:underline" title={`Open ${t.team}'s stories`}>{t.plannedDone}/{t.planned}</button>
                    <span className="hidden sm:block text-center text-sm">{t.completed}</span>
                    <span className={cn("hidden sm:block text-center text-sm", t.overdue ? "text-red-600 dark:text-red-300 font-semibold" : "")}>{t.overdue}</span>
                    <p className="sm:hidden col-span-2 text-xs text-muted-foreground -mt-1">{t.active}/{t.people} updated · {t.plannedDone}/{t.planned} due done · {t.overdue} overdue · <button type="button" className="text-primary underline" onClick={() => setLocation(`/global-kanban?team=${encodeURIComponent(t.team)}`)}>stories</button></p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* 4. People: one row each, problems first */}
          <Card className="macos-card border-none">
            <CardHeader className="pb-1">
              <CardTitle className="text-sm flex flex-wrap items-center gap-2">
                {onlyNoUpdate ? `No update ${periodWord}` : activeOnly ? `Updated ${periodWord}` : "People"}{team ? ` · ${team}` : ""} ({people.length})
                {(onlyNoUpdate || activeOnly || team) && <button type="button" className="text-xs font-normal text-primary underline" onClick={() => { setOnlyNoUpdate(false); setActiveOnly(false); setTeam(null); }} data-testid="people-show-all">show everyone</button>}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-3 pt-0" data-testid="overview-people">
              <div className="hidden md:grid grid-cols-[1.6fr_1fr_repeat(6,0.6fr)_1fr] gap-2 px-2 py-1 text-[11px] text-muted-foreground">
                <span>Person</span><span>Status</span><span className="text-center">Finished</span><span className="text-center">Due done</span><span className="text-center">Open</span><span className="text-center">Overdue</span><span className="text-center">Comments</span><span className="text-center">Updates</span><span>Last update</span>
              </div>
              {people.map((p) => <PersonRowView key={p.id} p={p} />)}
              {people.length === 0 && <p className="text-sm text-muted-foreground px-2 py-3">Nobody here.</p>}
              {idle.length > 0 && !onlyNoUpdate && !activeOnly && (
                <p className="text-xs text-muted-foreground px-2 pt-2" data-testid="people-idle">No work assigned: {idle.filter((p) => !team || p.team === team).map((p) => p.name).join(", ") || "nobody"}</p>
              )}
            </CardContent>
          </Card>

          {/* 5. Stuck work: overdue and blocked, once */}
          {stuck.length > 0 && (
            <Card className="macos-card border-none" data-testid="stuck-work">
              <CardHeader className="pb-1"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" />Stuck work ({stuck.length})</CardTitle></CardHeader>
              <CardContent className="p-2 sm:p-3 pt-0 space-y-0.5">
                {(showAllStuck ? stuck : stuck.slice(0, 8)).map(({ s, blocked, days }) => (
                  <button key={s.id} type="button" onClick={() => setLocation(`/global-kanban?story=${s.id}`)} className="w-full grid grid-cols-[1fr_auto] gap-2 items-center text-left rounded-lg px-2 py-2 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] min-h-[44px]">
                    <span className="min-w-0">
                      <span className="block text-sm font-medium truncate">{s.title}</span>
                      <span className="block text-xs text-muted-foreground truncate">{personName(s.assignedTo)} · {clientName(s.clientId)}</span>
                    </span>
                    <span className={cn("text-xs font-semibold whitespace-nowrap", blocked ? "text-orange-600 dark:text-orange-300" : "text-red-600 dark:text-red-300")}>
                      {blocked ? `Blocked${days ? ` ${days}d` : " today"}` : days ? `${days}d late` : "Due today, late"}
                    </span>
                  </button>
                ))}
                {stuck.length > 8 && <button type="button" className="text-xs text-primary underline px-2 py-1" onClick={() => setShowAllStuck(!showAllStuck)}>{showAllStuck ? "show less" : `show all ${stuck.length}`}</button>}
              </CardContent>
            </Card>
          )}

          {/* 6. Review queue and latest comments */}
          <div className="grid gap-3 lg:grid-cols-2 [&>*]:min-w-0">
            <Card className="macos-card border-none" data-testid="overview-review">
              <CardHeader className="pb-1"><CardTitle className="text-sm flex items-center gap-2"><Eye className="h-4 w-4 text-primary" /> Waiting for review ({data.review.length})</CardTitle></CardHeader>
              <CardContent className="space-y-0.5 p-2 sm:p-3 pt-0">
                {data.review.length === 0 && <p className="text-sm text-muted-foreground px-2">Nothing is waiting for review.</p>}
                {data.review.slice(0, 6).map((r) => (
                  <button key={r.storyId} onClick={() => setLocation(`/global-kanban?story=${r.storyId}`)} className="w-full text-left rounded-lg px-2 py-2 hover:bg-black/5 dark:hover:bg-white/10 min-h-[44px]">
                    <span className="block text-sm font-medium truncate">{r.title}</span>
                    <span className="block text-xs text-muted-foreground truncate">{r.assignee} · {r.client} · waiting {r.waitingDays === 0 ? "since today" : `${r.waitingDays} day${r.waitingDays === 1 ? "" : "s"}`}</span>
                  </button>
                ))}
              </CardContent>
            </Card>
            <Card className="macos-card border-none" data-testid="overview-comments">
              <CardHeader className="pb-1"><CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" />Latest comments ({data.summary.comments})</CardTitle></CardHeader>
              <CardContent className="space-y-0.5 p-2 sm:p-3 pt-0 max-h-[360px] overflow-y-auto">
                {data.recentComments.length === 0 && <p className="text-sm text-muted-foreground px-2">No comments {periodWord}.</p>}
                {data.recentComments.slice(0, 10).map((c) => (
                  <button key={c.id} onClick={() => setLocation(c.storyId ? `/global-kanban?story=${c.storyId}` : `/clients/${c.clientId}`)} className="w-full text-left rounded-lg px-2 py-2 hover:bg-black/5 dark:hover:bg-white/10 min-h-[44px]">
                    <span className="block text-sm break-words line-clamp-2"><b>{c.author}</b>: {c.body}</span>
                    <span className="block text-xs text-muted-foreground truncate">{c.storyTitle} · {formatDistanceToNow(new Date(c.at), { addSuffix: true })}</span>
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

function PersonRowView({ p }: { p: PersonRow }) {
  const [, setLocation] = useLocation();
  const board = (scope?: string) => `/global-kanban?assignee=${encodeURIComponent(p.name)}${scope ? `&scope=${scope}` : ""}`;
  const cells: { key: string; value: React.ReactNode; label: string; to: string; red?: boolean }[] = [
    { key: "done", value: p.completed, label: "finished", to: board("done") },
    { key: "plan", value: `${p.plannedDone}/${p.planned}`, label: "due done", to: board() },
    { key: "open", value: p.open, label: "open", to: board("open") },
    { key: "overdue", value: p.overdue, label: "overdue", to: board("overdue"), red: p.overdue > 0 },
    { key: "comments", value: p.comments, label: "comments", to: `/audit-log?user=${encodeURIComponent(p.id)}&type=comment` },
    { key: "updates", value: p.actions, label: "updates", to: `/audit-log?user=${encodeURIComponent(p.id)}` },
  ];
  return (
    <div className="grid grid-cols-[1fr_auto] md:grid-cols-[1.6fr_1fr_repeat(6,0.6fr)_1fr] items-center gap-x-2 gap-y-1 rounded-xl px-2 py-2 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] border-b border-black/[0.04] dark:border-white/[0.06] last:border-0" data-testid={`person-${p.name}`}>
      <button type="button" onClick={() => setLocation(board())} className="text-left min-w-0" title="Open their stories">
        <span className="block text-sm font-medium truncate">{p.name}</span>
        <span className="block text-[11px] text-muted-foreground truncate">{p.team}{p.away === "wfh" ? " · WFH today" : ""}</span>
      </button>
      <span className="justify-self-end md:justify-self-start" title={p.reason}><Chip health={p.health} /></span>
      <div className="col-span-2 md:contents grid grid-cols-6 gap-1">
        {cells.map((c) => (
          <button key={c.key} type="button" onClick={() => setLocation(c.to)} data-testid={`stat-${c.key}-${p.name}`} aria-label={`${c.value} ${c.label}`}
            className="text-center rounded-lg py-1 min-h-[36px] hover:bg-black/5 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <b className={cn("block text-sm leading-tight", c.red ? "text-red-600 dark:text-red-300" : "text-foreground")}>{c.value}</b>
            <span className="md:hidden block text-[10px] text-muted-foreground leading-tight">{c.label}</span>
          </button>
        ))}
      </div>
      <span className="hidden md:block text-xs text-muted-foreground truncate">{p.lastActiveAt ? formatDistanceToNow(new Date(p.lastActiveAt), { addSuffix: true }) : "not in 35 days"}</span>
    </div>
  );
}
