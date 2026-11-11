import { useEffect } from "react";
import { queryClient } from "./queryClient";

/**
 * Keeps every open page current without a reload: the server sends "change" over a
 * Server-Sent Events stream whenever anyone saves something, and we refetch what is on screen.
 */
export function useLiveSync(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof EventSource === "undefined") return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        queryClient.invalidateQueries({ refetchType: "active" });
      }, 400);
    };
    const es = new EventSource("/api/events", { withCredentials: true });
    let dropped = false;
    es.addEventListener("change", refresh);
    // After a dropped connection (sleep, network change) catch up on whatever was missed
    es.onerror = () => { dropped = true; };
    es.onopen = () => { if (dropped) { dropped = false; refresh(); } };
    return () => {
      es.close();
      if (timer) clearTimeout(timer);
    };
  }, [enabled]);
}
