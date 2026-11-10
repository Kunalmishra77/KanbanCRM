import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CalendarOff, Home, Clock, Loader2, Check, X } from "lucide-react";
import { useAuth, useCanApproveRequests } from "@/lib/auth";
import { canDecideRequest } from "@shared/roles";
import { useUsers } from "@/lib/queries";
import { useRequests, useRaiseRequest, useDecideRequest, useWithdrawRequest } from "@/lib/serviceQueries";
import { fullName } from "@/lib/assignee";
import { istDate } from "@shared/istDate";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { EmployeeRequest } from "@shared/schema";

type Kind = "leave" | "wfh" | "ot";
const KINDS: { id: Kind; label: string; icon: any; hint: string }[] = [
  { id: "leave", label: "Leave", icon: CalendarOff, hint: "Days you will be off. Repeating tasks pause for approved leave." },
  { id: "wfh", label: "Work from home", icon: Home, hint: "Days you will work from home. Your tasks continue as normal." },
  { id: "ot", label: "Overtime", icon: Clock, hint: "Extra hours you worked beyond your normal day." },
];
const KIND_LABEL: Record<string, string> = { leave: "Leave", wfh: "Work from home", ot: "Overtime" };
const STATUS_TONE: Record<string, string> = { pending: "bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/40", approved: "bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-500/40", rejected: "bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/40" };

const fmt = (d: string) => format(new Date(d + "T00:00:00"), "d MMM yyyy");
const span = (r: EmployeeRequest) => (r.startDate === r.endDate ? fmt(r.startDate) : `${fmt(r.startDate)} – ${fmt(r.endDate)}`);

export default function EmployeeServices() {
  const { user } = useAuth();
  const canApprove = useCanApproveRequests();
  const today = istDate();
  const [kind, setKind] = useState<Kind>("leave");
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [hours, setHours] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const { data: users = [] } = useUsers();
  const { data: mine = [], isLoading } = useRequests("mine");
  const { data: all = [] } = useRequests("all");
  const raise = useRaiseRequest();
  const decide = useDecideRequest();
  const withdraw = useWithdrawRequest();

  const nameOf = (id: string) => fullName((users as any[]).find((u) => u.id === id)) || "Unknown";
  // Only the requests this person is actually allowed to decide (the server enforces the same rule)
  const pending = useMemo(
    () => (all as EmployeeRequest[]).filter((r) => r.status === "pending" && canDecideRequest(user, (users as any[]).find((u) => u.id === r.userId))),
    [all, user, users],
  );
  // The log of what has been approved or rejected, newest first
  const decided = useMemo(
    () => (all as EmployeeRequest[]).filter((r) => r.status !== "pending" && r.decidedAt).sort((a, b) => +new Date(b.decidedAt as any) - +new Date(a.decidedAt as any)).slice(0, 15),
    [all],
  );
  // The approver's note: optional when approving, required (a reason) when rejecting
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [needReason, setNeedReason] = useState<string | null>(null);
  const decideWith = (r: EmployeeRequest, status: "approved" | "rejected") => {
    const note = (notes[r.id] || "").trim();
    if (status === "rejected" && note.length < 3) { setNeedReason(r.id); return; }
    setNeedReason(null);
    decide.mutate({ id: r.id, status, note: note || undefined }, { onSuccess: () => setNotes((m) => { const { [r.id]: _gone, ...rest } = m; return rest; }) });
  };
  const noteLine = (r: EmployeeRequest) =>
    r.decisionNote ? `${r.status === "rejected" ? "Reason" : "Note"}${r.decidedBy ? ` from ${nameOf(r.decidedBy)}` : ""}: ${r.decisionNote}` : null;
  const decisionLine = (r: EmployeeRequest) =>
    `${r.status === "approved" ? "Approved" : "Rejected"} by ${r.decidedBy ? nameOf(r.decidedBy) : "an approver"}${r.decidedAt ? ` · ${format(new Date(r.decidedAt as any), "d MMM, h:mm a")}` : ""}`;
  const month = today.slice(0, 7);
  const otByPerson = useMemo(() => {
    const m = new Map<string, number>();
    (all as EmployeeRequest[]).filter((r) => r.type === "ot" && r.status === "approved" && r.startDate.startsWith(month)).forEach((r) => m.set(r.userId, (m.get(r.userId) || 0) + Number(r.hours || 0)));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [all, month]);

  const submit = () => {
    setError("");
    if (reason.trim().length < 3) return setError("Please give a reason.");
    if (kind === "ot" && !(Number(hours) > 0)) return setError("Enter the overtime hours.");
    if (kind !== "ot" && end < start) return setError("The end date is before the start date.");
    raise.mutate(
      { type: kind, startDate: start, endDate: kind === "ot" ? undefined : end, hours: kind === "ot" ? hours : undefined, reason: reason.trim() },
      { onSuccess: () => { setReason(""); setHours(""); }, onError: (e: Error) => setError(e.message) },
    );
  };

  const active = KINDS.find((k) => k.id === kind)!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Employee services</h1>
        <p className="text-muted-foreground">Raise leave, work from home and overtime. A founder, the Chief of Staff or HR approves it, and you are notified when they decide.</p>
      </div>

      <Card className="macos-card border-none" data-testid="raise-request">
        <CardHeader className="pb-2"><CardTitle className="text-base">Raise a request</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Request type">
            {KINDS.map((k) => (
              <button key={k.id} role="tab" aria-selected={kind === k.id} data-testid={`kind-${k.id}`} onClick={() => { setKind(k.id); setError(""); }}
                className={cn("min-h-[56px] rounded-xl border px-2 py-2 text-sm font-medium flex flex-col items-center justify-center gap-1", kind === k.id ? "border-primary bg-primary/10 text-primary" : "bg-white/60 dark:bg-white/[0.08]")}>
                <k.icon className="h-4 w-4" />{k.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{active.hint}</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 [&>*]:min-w-0">
            <div className="space-y-1.5">
              <Label htmlFor="rq-start">{kind === "ot" ? "Date worked" : "From"}</Label>
              <Input id="rq-start" type="date" className="h-11" value={start} onChange={(e) => { setStart(e.target.value); if (end < e.target.value) setEnd(e.target.value); }} data-testid="rq-start" />
            </div>
            {kind !== "ot" ? (
              <div className="space-y-1.5">
                <Label htmlFor="rq-end">To</Label>
                <Input id="rq-end" type="date" className="h-11" min={start} value={end} onChange={(e) => setEnd(e.target.value)} data-testid="rq-end" />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="rq-hours">Hours worked</Label>
                <Input id="rq-hours" inputMode="decimal" className="h-11" placeholder="e.g. 2.5" value={hours} onChange={(e) => setHours(e.target.value)} data-testid="rq-hours" />
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rq-reason">Reason</Label>
            <Textarea id="rq-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={kind === "ot" ? "What did you work on?" : "Why?"} data-testid="rq-reason" />
          </div>
          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-300 font-medium" data-testid="rq-error">{error}</p>}
          <Button className="h-11 w-full sm:w-auto" onClick={submit} disabled={raise.isPending} data-testid="rq-submit">
            {raise.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Send for approval
          </Button>
        </CardContent>
      </Card>

      {canApprove && (
        <Card className="macos-card border-none" data-testid="approvals">
          <CardHeader className="pb-2"><CardTitle className="text-base">Waiting for your approval ({pending.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {pending.length === 0 && <p className="text-sm text-muted-foreground">Nothing to approve.</p>}
            {pending.map((r) => (
              <div key={r.id} className="rounded-xl border bg-white/60 dark:bg-white/[0.08] p-3" data-testid={`pending-${nameOf(r.userId)}-${r.type}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{nameOf(r.userId)} · {KIND_LABEL[r.type]}{r.type === "ot" ? ` · ${Number(r.hours)}h` : ""}</p>
                    <p className="text-xs text-muted-foreground">{span(r)}</p>
                    <p className="text-sm mt-1 break-words">{r.reason}</p>
                  </div>
                </div>
                <div className="mt-2 space-y-1">
                  <Label htmlFor={`note-${r.id}`} className="text-xs">Note for {nameOf(r.userId)} <span className="font-normal text-muted-foreground">(optional when approving, required when rejecting)</span></Label>
                  <Textarea
                    id={`note-${r.id}`}
                    rows={2}
                    maxLength={500}
                    value={notes[r.id] || ""}
                    onChange={(e) => { setNotes((m) => ({ ...m, [r.id]: e.target.value })); if (needReason === r.id) setNeedReason(null); }}
                    placeholder="e.g. Approved, enjoy the break. / Not possible this week because of the release."
                    className="macos-input text-sm min-h-0"
                    data-testid={`note-${r.id}`}
                  />
                  {needReason === r.id && <p role="alert" className="text-xs text-red-600 dark:text-red-300" data-testid={`note-error-${r.id}`}>Please write a reason so {nameOf(r.userId)} knows why.</p>}
                </div>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" className="h-10 flex-1 gap-1" disabled={decide.isPending || (r.userId === user?.id && !isFounderUser(user))} onClick={() => decideWith(r, "approved")} data-testid={`approve-${r.id}`}><Check className="h-4 w-4" />Approve</Button>
                  <Button size="sm" variant="outline" className="h-10 flex-1 gap-1" disabled={decide.isPending || (r.userId === user?.id && !isFounderUser(user))} onClick={() => decideWith(r, "rejected")} data-testid={`reject-${r.id}`}><X className="h-4 w-4" />Reject</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {canApprove && (
        <Card className="macos-card border-none" data-testid="decision-log">
          <CardHeader className="pb-2"><CardTitle className="text-base">Recent decisions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {decided.length === 0 && <p className="text-sm text-muted-foreground">Nothing has been approved or rejected yet.</p>}
            {decided.map((r) => (
              <div key={r.id} className="rounded-xl border bg-white/60 dark:bg-white/[0.08] p-3 flex items-start justify-between gap-2" data-testid={`logged-${r.id}`}>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{nameOf(r.userId)} · {KIND_LABEL[r.type]}{r.type === "ot" ? ` · ${Number(r.hours)}h` : ""} <span className="font-normal text-muted-foreground">· {span(r)}</span></p>
                  <p className="text-xs text-muted-foreground">{decisionLine(r)}</p>
                  {noteLine(r) && <p className="text-xs mt-1 break-words" data-testid={`logged-note-${r.id}`}>{noteLine(r)}</p>}
                </div>
                <Badge variant="outline" className={cn("capitalize shrink-0", STATUS_TONE[r.status])}>{r.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="macos-card border-none" data-testid="my-requests">
        <CardHeader className="pb-2"><CardTitle className="text-base">My requests</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {isLoading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
          {!isLoading && mine.length === 0 && <p className="text-sm text-muted-foreground">You have not raised any requests yet.</p>}
          {(mine as EmployeeRequest[]).map((r) => (
            <div key={r.id} className="rounded-xl border bg-white/60 dark:bg-white/[0.08] p-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{KIND_LABEL[r.type]}{r.type === "ot" ? ` · ${Number(r.hours)}h` : ""} <span className="font-normal text-muted-foreground">· {span(r)}</span></p>
                <p className="text-xs text-muted-foreground break-words">{r.reason}</p>
                {r.status === "pending" && <p className="text-xs mt-1 text-amber-700 dark:text-amber-300" data-testid={`waiting-${r.id}`}>Waiting for approval</p>}
                {r.status !== "pending" && <p className={cn("text-xs mt-1 font-medium", r.status === "approved" ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300")} data-testid={`decision-${r.id}`}>{decisionLine(r)}</p>}
                {noteLine(r) && <p className="text-sm mt-1 rounded-md bg-black/5 dark:bg-white/10 px-2 py-1 break-words" data-testid={`decision-note-${r.id}`}>{noteLine(r)}</p>}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge variant="outline" className={cn("capitalize", STATUS_TONE[r.status])}>{r.status}</Badge>
                {r.status === "pending" && <button className="text-xs text-primary underline min-h-[32px]" onClick={() => withdraw.mutate(r.id)}>Withdraw</button>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {(canApprove || otByPerson.length > 0) && (
        <Card className="macos-card border-none" data-testid="ot-summary">
          <CardHeader className="pb-2"><CardTitle className="text-base">Approved overtime this month</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {otByPerson.length === 0 && <p className="text-sm text-muted-foreground">No approved overtime yet this month.</p>}
            {otByPerson.map(([id, h]) => (
              <div key={id} className="flex items-center justify-between text-sm min-h-[36px]"><span className="truncate">{nameOf(id)}</span><b>{h} h</b></div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const isFounderUser = (u: { userType?: string | null } | null | undefined) => u?.userType === "founder" || u?.userType === "co-founder";
