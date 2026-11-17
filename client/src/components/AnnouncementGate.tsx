import { useMemo, useState } from "react";
import { Megaphone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNotifications, useMarkNotificationsRead, type NotificationRow } from "@/lib/serviceQueries";
import { useAnnouncements } from "@/lib/queries";

/**
 * A new announcement covers the screen until the person clicks "Got it": it cannot be closed by clicking
 * outside or pressing Esc. "Got it" marks that announcement's notification as read, so it never comes back
 * (on any device). Several new ones come one after another. The poster never gets their own.
 */
export function AnnouncementGate() {
  const { data } = useNotifications();
  const { data: announcements = [] } = useAnnouncements() as { data: any[] };
  const markRead = useMarkNotificationsRead();
  const [hidden, setHidden] = useState<Set<string>>(new Set()); // acknowledged on this screen, while the save runs

  const pending: NotificationRow[] = useMemo(() => {
    const items = Array.isArray(data?.items) ? data!.items : [];
    return items
      .filter((n) => n.type === "announcement" && !n.isRead && !hidden.has(n.id))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); // oldest first
  }, [data, hidden]);

  const current = pending[0];
  if (!current) return null;
  const full = announcements.find((a) => a.id === current.entityId);
  const title = full?.title || current.title.replace(/^📢\s*/, "");
  const body = full?.body ?? current.message;
  const by = full?.postedBy;

  const acknowledge = () => {
    setHidden((h) => new Set(h).add(current.id));
    markRead.mutate([current.id]);
  };

  return (
    <Dialog open onOpenChange={() => { /* only "Got it" closes it */ }}>
      <DialogContent
        className="max-w-lg [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        data-testid="announcement-gate"
      >
        <div className="flex items-start gap-3">
          <span className="h-10 w-10 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center"><Megaphone className="h-5 w-5" /></span>
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-primary">
              New announcement{pending.length > 1 ? ` · 1 of ${pending.length}` : ""}
            </p>
            <DialogTitle className="text-lg leading-snug break-words">{title}</DialogTitle>
            <DialogDescription className="text-xs">
              {by ? `${by} · ` : ""}{formatDistanceToNow(new Date(current.createdAt), { addSuffix: true })}
            </DialogDescription>
          </div>
        </div>
        <div className="max-h-[50vh] overflow-y-auto rounded-lg bg-muted/40 p-4 text-sm leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]" data-testid="announcement-body">
          {body}
        </div>
        {/* wrapped: the dialog hides its own direct-child buttons (the close ✕), this one must stay */}
        <div>
          <Button className="w-full h-11" onClick={acknowledge} data-testid="announcement-ack">
            Got it{pending.length > 1 ? " · next" : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
