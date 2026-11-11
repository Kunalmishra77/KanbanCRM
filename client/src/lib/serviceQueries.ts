import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { RecurringTask, EmployeeRequest } from "@shared/schema";

async function call<T = any>(method: string, url: string, body?: unknown): Promise<T> {
  const r = await fetch(url, { method, credentials: "include", headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Request failed");
  return r.status === 204 ? (null as T) : r.json();
}

// ---- repeating tasks (founders) ----
export function useRecurringTasks(enabled = true) {
  return useQuery<RecurringTask[]>({ queryKey: ["recurring-tasks"], queryFn: () => call("GET", "/api/recurring-tasks"), enabled });
}

function useInvalidating<TVars, TData>(fn: (v: TVars) => Promise<TData>, ok: (d: TData) => string, fail: string) {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: (d) => {
      ["recurring-tasks", "stories", "requests", "overview", "notifications"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast({ title: ok(d) });
    },
    onError: (e: Error) => toast({ title: fail, description: e.message, variant: "destructive" }),
  });
}

export const useCreateRecurringTask = () =>
  useInvalidating((v: any) => call<{ task: RecurringTask; created: number }>("POST", "/api/recurring-tasks", v), (d) => (d.created > 0 ? `Repeating task saved. ${d.created} task${d.created === 1 ? "" : "s"} created for today.` : "Repeating task saved."), "Could not save the repeating task");
export const useToggleRecurringTask = () =>
  useInvalidating(({ id, active }: { id: string; active: boolean }) => call("PATCH", `/api/recurring-tasks/${id}`, { active }), () => "Updated", "Could not update");
export const useDeleteRecurringTask = () =>
  useInvalidating((id: string) => call("DELETE", `/api/recurring-tasks/${id}`), () => "Repeating task deleted. Tasks already created stay.", "Could not delete");

// ---- personal notifications (the bell) ----
export type NotificationRow = { id: string; type: string; title: string; message: string; link: string | null; entityType?: string | null; entityId?: string | null; isRead: boolean; createdAt: string };
export function useNotifications() {
  return useQuery<{ items: NotificationRow[]; unread: number }>({
    queryKey: ["notifications"],
    queryFn: () => call("GET", "/api/notifications"),
    refetchInterval: 60_000, // live updates bring new items at once; this is only a safety net
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
}
export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids?: string[]) => call("POST", "/api/notifications/read", ids ? { ids } : {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

// ---- employee services ----
export function useRequests(scope: "mine" | "all") {
  return useQuery<EmployeeRequest[]>({ queryKey: ["requests", scope], queryFn: () => call("GET", `/api/requests${scope === "all" ? "?scope=all" : ""}`) });
}
export const useRaiseRequest = () =>
  useInvalidating((v: any) => call<EmployeeRequest>("POST", "/api/requests", v), () => "Request sent for approval", "Could not send the request");
export const useDecideRequest = () =>
  useInvalidating(({ id, status, note }: { id: string; status: "approved" | "rejected"; note?: string }) => call("PATCH", `/api/requests/${id}`, { status, note }), () => "Decision saved", "Could not save the decision");
export const useWithdrawRequest = () =>
  useInvalidating((id: string) => call("DELETE", `/api/requests/${id}`), () => "Request withdrawn", "Could not withdraw");
