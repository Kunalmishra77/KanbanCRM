import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, AlertTriangle, Ban, UserX, CalendarClock, CheckCircle2, MessageSquare, Repeat } from "lucide-react";
import { useOverview, type Health, type PersonRow } from "@/lib/overviewQueries";
import type { Period } from "@shared/istDate";
import type { Story, Client } from "@shared/schema";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format, differenceInCalendarDays } from "date-fns";

const PERIODS: { id: Period; label: string }[] = [
  { id: "yesterday", label: "Yesterday" },
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
];
const WORD: Record<Period, string> = { yesterday: "yesterday", today: "today", week: "this week", month: "this month" };

const HEALTH: Record<Health, { label: string; dot: string; chip: string }> = {
  good: { label: "On track", dot: "bg-green-500", chip: "bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-500/40" },
  attention: { label: "Work late", dot: "bg-red-500", chip: "bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/40" },
  missed: { label: "Missed routine", dot: "bg-orange-400", chip: "bg-orange-50 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-500/40" },
  inactive: { label: "No update", dot: "bg-amber-500", chip: "bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/40" },
  idle: { label: "No work", dot: "bg-slate-400", chip: "bg-muted text-foreground/80 border-border" },
  away: { label: "On leave", dot: "bg-sky-500", chip: "bg-sky-50 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/40" },
};

function Chip({ health, title }: { health: Health; title?: string }) {
  const h = HEALTH[health];
  return (
    <span title={title} className={cn("inline-flex items-center gap-1.5 text-[11px] border rounded-full px-2 py-0.5 shrink-0 whitespace-nowrap", h.chip)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", h.dot)} />{h.label}
    </span>
  );
}

/** Done out of due, as a small bar (empty when nothing was due). */
function DueBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <span className="flex items-center gap-2 min-w-0">
      <span className="hidden md:block h-1.5 flex-1 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden"><span className={cn("block h-full", pct >= 80 ? "bg-green-500" : pct >= 40 ? "bg-amber-500" : "bg-red-400")} style={{ width: `${pct}%` }} /></span>
      <b className="text-sm tabular-nums">{total ? `${done}/${total}` : "–"}</b>
    </span>
  );
}

/** A fixed-height placeholder so the page doesn't jump while the numbers load. */
function Placeholder({ h }: { h: string }) {
  return <div className={cn("rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] animate-pulse", h)} />;
}

/**
 * Team view of the dashboard (founders and chief of staff: everyone; a team lead: her team).
 * Order: what needs attention -> the numbers -> teams -> people -> late work -> missed routines -> review and comments.
 * Mornings (before 12 PM) open on yesterday's results, since "today" has barely started.
 */
export function FounderOverview({ title = "Company overview", stories = [], clients = [] }: { title?: string; stories?: Story[]; clients?: Client[] }) {
  const [period, setPeriod] = useState<Period>(() => (new Date().getHours() < 12 ? "yesterday" : "today"));
  const [team, setTeam] = useState<string | null>(null);
  const [onlyNoUpdate, setOnlyNoUpdate] = useState(false);
  const [activeOnly, setActiveOnly] = useState(false);
  const [showAllStuck, setShowAllStuck] = useState(false);
  const [showAllMissed, setShowAllMissed] = useState(false);
  const [, setLocation] = useLocation();
  const { data, isLoading, error } = useOverview(period, true);
  const valid = !!data && Array.isArray(data.people) && Array.isArray(data.teams);
  const go = (q: string) => setLocation(`/global-kanban?${q}`);
  const word = WORD[period];

  const peopleIds = useMemo(() => new Set((data?.people || []).map((p) => p.id)), [data]);
  // Late work (not routines) + blocked, once, oldest problem first
  const stuck = useMemo(() => {
    const now = Date.now();
    return stories
      .filter((s) => s.status !== "Done" && s.assignedTo && peopleIds.has(s.assignedTo))
      .map((s) => {
        const late = !s.recurringTaskId && !!s.dueDate && new Date(s.dueDate).getTime() < now;
        const blocked = s.status === "Blocked";
        const since = blocked ? new Date(s.updatedAt as any) : new Date(s.dueDate);
        return { s, late, blocked, days: Math.max(0, differenceInCalendarDays(new Date(), since)) };
      })
      .filter((x) => x.late || x.blocked)
      .sort((a, b) => b.days - a.days);
  }, [stories, peopleIds]);
  const blockedCount = stuck.filter((x) => x.blocked).length;
  const clientName = (id: string) => clients.find((c) => c.id === id)?.name || "";
  const personName = (id?: string | null) => data?.people.find((p) => p.id === id)?.name || "";

  const visibleTeams = (data?.teams || []).filter((t) => t.team !== "No team set" || t.planned > 0 || t.completed > 0 || t.overdue > 0);
  const allPeople = valid && data ? data.people : [];
  const silent = (p: PersonRow) => p.health !== "idle" && p.health !== "away" && p.comments + p.actions === 0;
  const noUpdate = allPeople.filter(silent);
  const idle = allPeople.filter((p) => p.health === "idle");
  const people = allPeople.filter((p) => p.health !== "idle"
    && (!team || p.team === team)
    && (!onlyNoUpdate || silent(p))
    && (!activeOnly || p.comments + p.actions > 0));
  const missedGroups = data?.missedRoutines || [];
  const missedTotal = data?.summary.missed || 0;
  const showPeople = () => document.querySelector('[data-testid="overview-people"]')?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <section className="space-y-4" data-testid="founder-overview">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <p className="text-xs text-muted-foreground min-h-[16px]">
            {data ? (period === "yesterday" || period === "today" ? format(new Date(data.from), "EEEE d MMM") : `${format(new Date(data.from), "d MMM")} – ${format(new Date(new Date(data.to).getTime() - 1), "d MMM")}`) : ""}
            {period === "yesterday" && new Date().getHours() < 12 && " · mornings show yesterday's results"}
          </p>
        </div>
        <div className="inline-flex rounded-xl bg-black/5 dark:bg-white/10 p-1 overflow-x-auto max-w-full" role="tablist" aria-label="Period">
          {PERIODS.map((p) => (
            <button key={p.id} role="tab" aria-selected={period === p.id} onClick={() => setPeriod(p.id)} data-testid={`period-${p.id}`}
              className={cn("shrink-0 min-h-[36px] px-3 rounded-lg text-sm font-medium transition-colors", period === p.id ? "bg-white dark:bg-card shadow text-primary" : "text-muted-foreground")}>
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
          {/* 1. Needs attention: only what needs someone to act. Late client work is red; missed routines orange. */}
          <div className="rounded-2xl border bg-white/70 dark:bg-white/[0.06] p-3" data-testid="needs-attention">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Needs attention</p>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "overdue", n: data.summary.overdue, label: "late", icon: AlertTriangle, tone: "text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-500/15 border-red-200 dark:border-red-500/30", go: () => go("scope=late") },
                { key: "blocked", n: blockedCount, label: "blocked", icon: Ban, tone: "text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-500/15 border-red-200 dark:border-red-500/30", go: () => go("board=all&status=Blocked") },
                { key: "missed", n: missedTotal, label: `routine cop${missedTotal === 1 ? "y" : "ies"} missed`, icon: Repeat, tone: "text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-500/15 border-orange-200 dark:border-orange-500/30", go: () => document.querySelector('[data-testid="missed-routines"]')?.scrollIntoView({ behavior: "smooth", block: "start" }) },
                { key: "review", n: data.summary.waitingReview, label: "waiting for review", icon: Eye, tone: "text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-500/15 border-violet-200 dark:border-violet-500/30", go: () => go("scope=review") },
                { key: "noupdate", n: noUpdate.length, label: `${noUpdate.length === 1 ? "person" : "people"} with no update ${word}`, icon: UserX, tone: "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/30", go: () => { setOnlyNoUpdate(true); setActiveOnly(false); showPeople(); } },
                { key: "requests", n: data.summary.pendingRequests || 0, label: "leave / WFH requests to approve", icon: CalendarClock, tone: "text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/15 border-sky-200 dark:border-sky-500/30", go: () => setLocation("/services") },
              ].filter((x) => x.n > 0).map((x) => (
                <button key={x.key} type="button" onClick={x.go} data-testid={`summary-${x.key}`}
                  className={cn("inline-flex items-center gap-2 rounded-xl border px-3 h-10 text-sm font-medium hover:shadow-sm transition-shadow", x.tone)}>
                  <x.icon className="h-4 w-4" /><b className="text-base">{x.n}</b> {x.label}
                </button>
              ))}
              {data.summary.overdue === 0 && blockedCount === 0 && missedTotal === 0 && data.summary.waitingReview === 0 && noUpdate.length === 0 && !data.summary.pendingRequests && (
                <span className="inline-flex items-center gap-2 text-sm text-green-700 dark:text-green-300"><CheckCircle2 className="h-4 w-4" />All good: nothing late, blocked or waiting.</span>
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
              { key: "active", value: `${data.summary.peopleActive}/${data.summary.peopleWorking}`, label: `people updated ${word}`, go: () => { setActiveOnly(true); setOnlyNoUpdate(false); showPeople(); } },
              { key: "planned", value: `${data.summary.plannedDone}/${data.summary.planned}`, label: `due ${word}: done`, go: () => go(`scope=planned&from=${encodeURIComponent(data.from)}&to=${encodeURIComponent(data.to)}`) },
              { key: "completed", value: String(data.summary.completed), label: `finished ${word}`, go: () => go(`scope=completed&from=${encodeURIComponent(data.from)}&to=${encodeURIComponent(data.to)}`) },
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
              <CardHeader className="pb-1"><CardTitle className="text-sm">Teams <span className="font-normal text-muted-foreground">· click a team to see its people</span> {team && <button className="ml-2 text-xs font-normal text-primary underline" onClick={() => setTeam(null)}>show all people</button>}</CardTitle></CardHeader>
              <CardContent className="p-2 sm:p-3 pt-0" data-testid="overview-teams">
                <div className="hidden sm:grid grid-cols-[1.3fr_1.1fr_0.7fr_1.2fr_0.6fr_0.6fr] gap-3 px-2 py-1 text-[11px] text-muted-foreground">
                  <span>Team</span><span>Status</span><span className="text-center">Updated</span><span>Due {word}: done</span><span className="text-center">Late</span><span className="text-center">Missed</span>
                </div>
                {visibleTeams.map((t) => (
                  <div key={t.team} className={cn("grid grid-cols-[1fr_auto] sm:grid-cols-[1.3fr_1.1fr_0.7fr_1.2fr_0.6fr_0.6fr] items-center gap-3 rounded-xl px-2 py-2 hover:bg-black/[0.03] dark:hover:bg-white/[0.05]", team === t.team && "bg-primary/5 ring-1 ring-primary/40")}>
                    <button type="button" onClick={() => { setTeam(team === t.team ? null : t.team); showPeople(); }} className="text-left font-medium truncate min-h-[32px]" title="Show this team's people">{t.team}</button>
                    <span className="justify-self-end sm:justify-self-start"><Chip health={t.health} title={t.reason} /></span>
                    <span className="hidden sm:block text-center text-sm tabular-nums">{t.active}/{t.people}</span>
                    <button type="button" data-testid={`team-${t.team}`} onClick={() => setLocation(`/global-kanban?team=${encodeURIComponent(t.team)}`)} className="hidden sm:block text-left" title={`Open ${t.team}'s stories`}><DueBar done={t.plannedDone} total={t.planned} /></button>
                    <span className={cn("hidden sm:block text-center text-sm tabular-nums", t.overdue ? "text-red-600 dark:text-red-300 font-semibold" : "text-muted-foreground")}>{t.overdue}</span>
                    <span className={cn("hidden sm:block text-center text-sm tabular-nums", t.missed ? "text-orange-600 dark:text-orange-300 font-semibold" : "text-muted-foreground")}>{t.missed}</span>
                    <p className="sm:hidden col-span-2 text-xs text-muted-foreground -mt-1">{t.plannedDone}/{t.planned} due done · {t.overdue} late · {t.missed} missed · <button type="button" className="text-primary underline" onClick={() => setLocation(`/global-kanban?team=${encodeURIComponent(t.team)}`)}>stories</button></p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* 4. People: one row each, problems first */}
          <Card className="macos-card border-none">
            <CardHeader className="pb-1">
              <CardTitle className="text-sm flex flex-wrap items-center gap-2">
                {onlyNoUpdate ? `No update ${word}` : activeOnly ? `Updated ${word}` : "People"}{team ? ` · ${team}` : ""} ({people.length})
                {(onlyNoUpdate || activeOnly || team) && <button type="button" className="text-xs font-normal text-primary underline" onClick={() => { setOnlyNoUpdate(false); setActiveOnly(false); setTeam(null); }} data-testid="people-show-all">show everyone</button>}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-3 pt-0" data-testid="overview-people">
              <div className="hidden md:grid grid-cols-[1.5fr_1.1fr_1.3fr_0.55fr_0.55fr_0.55fr_1fr] gap-3 px-2 py-1 text-[11px] text-muted-foreground">
                <span>Person</span><span>Status</span><span>Due {word}: done</span><span className="text-center">Late</span><span className="text-center">Missed</span><span className="text-center">Open</span><span>Last update</span>
              </div>
              {people.map((p) => <PersonRowView key={p.id} p={p} />)}
              {people.length === 0 && <p className="text-sm text-muted-foreground px-2 py-3">Nobody here.</p>}
              {idle.length > 0 && !onlyNoUpdate && !activeOnly && (
                <p className="text-xs text-muted-foreground px-2 pt-2" data-testid="people-idle">No work assigned: {idle.filter((p) => !team || p.team === team).map((p) => p.name).join(", ") || "nobody"}</p>
              )}
            </CardContent>
          </Card>

          {/* 5. Late work and blocked: client work that is stuck */}
          {stuck.length > 0 && (
            <Card className="macos-card border-none" data-testid="stuck-work">
              <CardHeader className="pb-1"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" />Late or blocked work ({stuck.length})</CardTitle></CardHeader>
              <CardContent className="p-2 sm:p-3 pt-0 space-y-0.5">
                {(showAllStuck ? stuck : stuck.slice(0, 8)).map(({ s, blocked, days }) => (
                  <button key={s.id} type="button" onClick={() => setLocation(`/global-kanban?story=${s.id}`)} className="w-full grid grid-cols-[1fr_auto] gap-2 items-center text-left rounded-lg px-2 py-2 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] min-h-[44px]">
                    <span className="min-w-0">
                      <span className="block text-sm font-medium truncate">{s.title}</span>
                      <span className="block text-xs text-muted-foreground truncate">{personName(s.assignedTo)} · {clientName(s.clientId)}</span>
                    </span>
                    <span className={cn("text-xs font-semibold whitespace-nowrap", blocked ? "text-orange-600 dark:text-orange-300" : "text-red-600 dark:text-red-300")}>
                      {blocked ? `Blocked${days ? ` ${days}d` : " today"}` : days ? `${days}d late` : "Late today"}
                    </span>
                  </button>
                ))}
                {stuck.length > 8 && <button type="button" className="text-xs text-primary underline px-2 py-1" onClick={() => setShowAllStuck(!showAllStuck)}>{showAllStuck ? "show less" : `show all ${stuck.length}`}</button>}
              </CardContent>
            </Card>
          )}

          {/* 6. Missed routines, grouped by task and day */}
          {missedGroups.length > 0 && (
            <Card className="macos-card border-none" data-testid="missed-routines">
              <CardHeader className="pb-1"><CardTitle className="text-sm flex items-center gap-2"><Repeat className="h-4 w-4 text-orange-500" />Missed routines ({missedTotal})</CardTitle></CardHeader>
              <CardContent className="p-2 sm:p-3 pt-0 space-y-0.5">
                {(showAllMissed ? missedGroups : missedGroups.slice(0, 6)).map((g) => (
                  <button key={g.title + g.date} type="button" onClick={() => go("scope=missed")} className="w-full grid grid-cols-[1fr_auto] gap-2 items-center text-left rounded-lg px-2 py-2 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] min-h-[44px]">
                    <span className="min-w-0">
                      <span className="block text-sm font-medium truncate">{g.title}</span>
                      <span className="block text-xs text-muted-foreground truncate">Not done by {g.people.join(", ")}</span>
                    </span>
                    <span className="text-xs text-orange-600 dark:text-orange-300 font-semibold whitespace-nowrap">{format(new Date(g.date + "T12:00:00"), "d MMM")}</span>
                  </button>
                ))}
                {missedGroups.length > 6 && <button type="button" className="text-xs text-primary underline px-2 py-1" onClick={() => setShowAllMissed(!showAllMissed)}>{showAllMissed ? "show less" : `show all ${missedGroups.length}`}</button>}
              </CardContent>
            </Card>
          )}

          {/* 7. Review queue and latest comments */}
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
                {data.recentComments.length === 0 && <p className="text-sm text-muted-foreground px-2">No comments {word}.</p>}
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
  return (
    <div className="grid grid-cols-[1fr_auto] md:grid-cols-[1.5fr_1.1fr_1.3fr_0.55fr_0.55fr_0.55fr_1fr] items-center gap-x-3 gap-y-1 rounded-xl px-2 py-2 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] border-b border-black/[0.04] dark:border-white/[0.06] last:border-0" data-testid={`person-${p.name}`}>
      <button type="button" onClick={() => setLocation(board())} className="text-left min-w-0" title="Open their stories">
        <span className="block text-sm font-medium truncate">{p.name}</span>
        <span className="block text-[11px] text-muted-foreground truncate">{p.team}{p.away === "wfh" ? " · WFH today" : ""}</span>
      </button>
      <span className="justify-self-end md:justify-self-start"><Chip health={p.health} title={p.reason} /></span>
      <div className="col-span-2 md:contents grid grid-cols-[1.4fr_repeat(3,1fr)] gap-2 items-center">
        <button type="button" onClick={() => setLocation(board())} data-testid={`stat-plan-${p.name}`} className="text-left min-h-[32px]" title="Open their stories">
          <DueBar done={p.plannedDone} total={p.planned} /><span className="md:hidden block text-[10px] text-muted-foreground">due done</span>
        </button>
        {[
          { key: "overdue", value: p.overdue, label: "late", to: board("late"), tone: p.overdue ? "text-red-600 dark:text-red-300" : "text-muted-foreground" },
          { key: "missed", value: p.missed, label: "missed", to: board("missed"), tone: p.missed ? "text-orange-600 dark:text-orange-300" : "text-muted-foreground" },
          { key: "open", value: p.open, label: "open", to: board("open"), tone: "text-foreground" },
        ].map((c) => (
          <button key={c.key} type="button" onClick={() => setLocation(c.to)} data-testid={`stat-${c.key}-${p.name}`} aria-label={`${c.value} ${c.label}`}
            className="text-center rounded-lg py-1 min-h-[32px] hover:bg-black/5 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <b className={cn("block text-sm leading-tight tabular-nums", c.tone)}>{c.value}</b>
            <span className="md:hidden block text-[10px] text-muted-foreground leading-tight">{c.label}</span>
          </button>
        ))}
      </div>
      <span className="hidden md:block text-xs text-muted-foreground truncate" title={p.reason}>{p.lastActiveAt ? formatDistanceToNow(new Date(p.lastActiveAt), { addSuffix: true }) : "not in 35 days"}</span>
    </div>
  );
}
