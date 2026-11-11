import { useMemo } from "react";
import { useLocation } from "wouter";
import { Megaphone, Pin } from "lucide-react";
import { useAnnouncements } from "@/lib/queries";

type Ann = { id: string; title: string; body: string; postedBy: string; isPinned: boolean; createdAt: string };

/** A news-ticker strip on the dashboard: pinned and recent (30 days) announcements scroll past; click one to open it. */
export function AnnouncementTicker() {
  const { data = [] } = useAnnouncements();
  const [, setLocation] = useLocation();

  const items = useMemo(() => {
    const cutoff = Date.now() - 30 * 86400000;
    return (data as Ann[])
      .filter((a) => a.isPinned || new Date(a.createdAt).getTime() >= cutoff)
      .sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, 10);
  }, [data]);

  if (items.length === 0) return null;

  // Roughly constant reading speed however many items there are
  const seconds = Math.max(20, items.reduce((n, a) => n + a.title.length + Math.min(a.body.length, 120), 0) / 6);

  const row = (copy: number) =>
    items.map((a) => (
      <button
        key={`${copy}-${a.id}`}
        type="button"
        tabIndex={copy === 0 ? 0 : -1}
        aria-hidden={copy === 1}
        onClick={() => setLocation(`/announcements?id=${a.id}`)}
        className="inline-flex items-center gap-2 px-5 text-sm whitespace-nowrap hover:text-primary focus:outline-none focus-visible:underline"
      >
        {a.isPinned ? <Pin className="h-3.5 w-3.5 text-primary shrink-0" /> : <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
        <span className="font-semibold">{a.title}</span>
        <span className="text-muted-foreground">— {a.body.length > 120 ? `${a.body.slice(0, 120)}…` : a.body}</span>
      </button>
    ));

  return (
    <div className="flex items-stretch overflow-hidden rounded-xl border border-primary/20 bg-primary/[0.06]" data-testid="announcement-ticker">
      <button
        type="button"
        onClick={() => setLocation("/announcements")}
        className="flex shrink-0 items-center gap-2 bg-primary px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white dark:text-primary-foreground"
      >
        <Megaphone className="h-4 w-4" />
        <span className="hidden sm:inline">Announcements</span>
      </button>
      <div className="ticker-viewport relative flex-1 overflow-hidden py-2">
        <div className="ticker-track inline-flex" style={{ animationDuration: `${seconds}s` }}>
          {row(0)}
          {row(1)}
        </div>
      </div>
    </div>
  );
}
