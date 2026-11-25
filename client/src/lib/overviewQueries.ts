import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Period } from "@shared/istDate";

export type Health = "good" | "attention" | "missed" | "inactive" | "idle" | "away";
export type PersonRow = {
  id: string; name: string; team: string;
  assigned: number; open: number; overdue: number; missed: number; review: number;
  planned: number; plannedDone: number; completed: number;
  comments: number; actions: number; lastActiveAt: string | null; health: Health; reason: string;
  away: "leave" | "wfh" | null; otHours: number;
};
export type TeamRow = {
  team: string; people: number; active: number;
  planned: number; plannedDone: number; completed: number; overdue: number; missed: number; review: number; health: Health; reason: string;
};
export type Overview = {
  period: Period | "custom"; from: string; to: string;
  summary: { peopleWorking: number; peopleActive: number; planned: number; plannedDone: number; completed: number; overdue: number; missed: number; waitingReview: number; comments: number; pendingRequests: number; otHours: number; awayToday: { leave: string[]; wfh: string[] } };
  teams: TeamRow[]; people: PersonRow[];
  review: { storyId: string; title: string; clientId: string; client: string; assignee: string; team: string; waitingDays: number }[];
  recentComments: { id: string; storyId?: string; author: string; body: string; storyTitle: string; clientId: string; client: string; at: string }[];
  missedRoutines?: { title: string; date: string; people: string[]; storyIds: string[] }[];
};
export type Mention = { id: string; storyId: string; storyTitle: string; clientId: string; authorName: string | null; body: string; createdAt: string; state?: "new" | "answered" | "done" };

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { credentials: "include" });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Request failed");
  return r.json();
}

export function useOverview(period: Period | "custom", enabled: boolean, range?: { from: string; to: string }) {
  const custom = period === "custom" && range?.from && range?.to;
  return useQuery<Overview>({
    queryKey: ["overview", period, custom ? range!.from : "", custom ? range!.to : ""],
    queryFn: () => getJson<Overview>(custom ? `/api/overview?from=${range!.from}&to=${range!.to}` : `/api/overview?period=${period === "custom" ? "today" : period}`),
    enabled,
    staleTime: 60_000,
  });
}

export function useMentions() {
  return useQuery<Mention[]>({ queryKey: ["mentions"], queryFn: () => getJson<Mention[]>("/api/mentions"), staleTime: 60_000 });
}

/** Tick a mention that needs no reply. */
export function useMentionDone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      const r = await fetch(`/api/mentions/${commentId}/done`, { method: "POST", credentials: "include" });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Request failed");
    },
    onMutate: async (commentId) => { // disappears at once
      await qc.cancelQueries({ queryKey: ["mentions"] });
      qc.setQueryData<Mention[]>(["mentions"], (old) => (old || []).map((m) => (m.id === commentId ? { ...m, state: "done" } : m)));
    },
    onSettled: () => { qc.invalidateQueries({ queryKey: ["mentions"] }); qc.invalidateQueries({ queryKey: ["notifications"] }); },
  });
}
