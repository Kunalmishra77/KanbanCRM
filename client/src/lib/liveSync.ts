import { useEffect } from "react";
import { queryClient } from "./queryClient";

/**
 * Keeps every open page current without a reload: the server sends "change" over a
 * Server-Sent Events stream whenever anyone saves something, and we refetch what is on screen.
 *
 * Every refetch is a burst of database queries, and the database answers only ~12 queries a second
 * from our server. So that one save does not make every open tab in the company hit it at once:
 *  - tabs in the background do not refetch; they catch up once, when they are looked at again
 *  - visible tabs wait a random 0.5-3.5s, which spreads their refetches out
 */
export function useLiveSync(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof EventSource === "undefined") return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let missed = false;
    const refetchNow = () => queryClient.invalidateQueries({ refetchType: "active" });
    const refresh = () => {
      if (document.hidden) { missed = true; return; }
      if (timer) return;
      timer = setTimeout(() => { timer = null; refetchNow(); }, 500 + Math.random() * 3000);
    };
    const onVisible = () => {
      if (!document.hidden && missed) { missed = false; refresh(); }
    };
    const es = new EventSource("/api/events", { withCredentials: true });
    let dropped = false;
    es.addEventListener("change", refresh);
    // After a dropped connection (sleep, network change, server restart) catch up on whatever was missed
    es.onerror = () => { dropped = true; };
    es.onopen = () => { if (dropped) { dropped = false; refresh(); } };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      es.close();
      document.removeEventListener("visibilitychange", onVisible);
      if (timer) clearTimeout(timer);
    };
  }, [enabled]);
}
