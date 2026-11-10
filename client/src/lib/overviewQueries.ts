import { useQuery } from "@tanstack/react-query";
import type { Period } from "@shared/istDate";

export type Health = "good" | "attention" | "inactive" | "idle" | "away";
export type PersonRow = {
  id: string; name: string; team: string;
  assigned: number; open: number; overdue: number; review: number;
  planned: number; plannedDone: number; completed: number;
  comments: number; actions: number; lastActiveAt: string | null; health: Health; reason: string;
  away: "leave" | "wfh" | null; otHours: number;
};
export type TeamRow = {
  team: string; people: number; active: number;
  planned: number; plannedDone: number; completed: number; overdue: number; review: number; health: Health; reason: string;
};
export type Overview = {
  period: Period; from: string; to: string;
  summary: { peopleWorking: number; peopleActive: number; planned: number; plannedDone: number; completed: number; overdue: number; waitingReview: number; comments: number; pendingRequests: number; otHours: number; awayToday: { leave: string[]; wfh: string[] } };
  teams: TeamRow[]; people: PersonRow[];
  review: { storyId: string; title: string; clientId: string; client: string; assignee: string; team: string; waitingDays: number }[];
  recentComments: { id: string; author: string; body: string; storyTitle: string; clientId: string; client: string; at: string }[];
};
export type Mention = { id: string; storyId: string; storyTitle: string; clientId: string; authorName: string | null; body: string; createdAt: string };

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { credentials: "include" });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Request failed");
  return r.json();
}

export function useOverview(period: Period, enabled: boolean) {
  return useQuery<Overview>({
    queryKey: ["overview", period],
    queryFn: () => getJson<Overview>(`/api/overview?period=${period}`),
    enabled,
    staleTime: 60_000,
  });
}

export function useMentions() {
  return useQuery<Mention[]>({ queryKey: ["mentions"], queryFn: () => getJson<Mention[]>("/api/mentions"), staleTime: 60_000 });
}
