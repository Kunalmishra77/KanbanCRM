import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Bell, Users, FileText, CheckCircle, Edit, Trash2, MessageSquare, CalendarClock, XCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useActivityLog } from "@/lib/queries";
import { useNotifications, useMarkNotificationsRead, type NotificationRow } from "@/lib/serviceQueries";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

type ActivityLog = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  userId: string;
  details: string;
  createdAt: string;
};

function getActivityIcon(entityType: string, action: string) {
  if (action === 'deleted') return <Trash2 className="h-4 w-4 text-red-500" />;
  if (action === 'created') return <CheckCircle className="h-4 w-4 text-green-500" />;
  if (action === 'updated') return <Edit className="h-4 w-4 text-blue-500" />;
  if (entityType === 'client') return <Users className="h-4 w-4 text-primary" />;
  if (entityType === 'story') return <FileText className="h-4 w-4 text-orange-500" />;
  if (entityType === 'comment') return <MessageSquare className="h-4 w-4 text-purple-500" />;
  return <Bell className="h-4 w-4" />;
}

function notificationIcon(n: NotificationRow) {
  if (n.type === "request_decided" || n.type === "request_decided_fyi") {
    return /rejected/i.test(n.title) ? <XCircle className="h-4 w-4 text-red-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />;
  }
  if (n.type === "request_submitted") return <Send className="h-4 w-4 text-blue-500" />;
  if (n.type === "request_pending") return <CalendarClock className="h-4 w-4 text-amber-500" />;
  return <Bell className="h-4 w-4 text-primary" />;
}

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"you" | "activity">("you");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: mine, isLoading: loadingMine } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const { data: activities = [], isLoading: loadingActivity } = useActivityLog(20);

  const items = mine?.items ?? [];
  const unreadCount = mine?.unread ?? 0;

  // Pop-up: a toast for every notification that arrives while the app is open (and one summary on opening it)
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!mine) return;
    const unread = mine.items.filter((n) => !n.isRead);
    if (seen.current === null) {
      seen.current = new Set(mine.items.map((n) => n.id));
      if (unread.length > 0) {
        toast({
          title: unread.length === 1 ? unread[0].title : `${unread.length} new notifications`,
          description: unread.length === 1 ? unread[0].message : "Open the bell to read them.",
        });
      }
      return;
    }
    const fresh = unread.filter((n) => !seen.current!.has(n.id));
    fresh.forEach((n) => seen.current!.add(n.id));
    fresh.slice(0, 3).forEach((n) => toast({ title: n.title, description: n.message }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mine]);

  const openItem = (n: NotificationRow) => {
    if (!n.isRead) markRead.mutate([n.id]);
    setOpen(false);
    if (n.link) setLocation(n.link);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-black/5 dark:hover:bg-white/10 relative h-9 w-9"
          data-testid="button-notifications"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span data-testid="notification-badge" className="absolute top-1 right-1 min-w-4 h-4 px-0.5 rounded-full bg-red-500 border-2 border-background text-[10px] font-medium text-white flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-2rem)] sm:w-96 p-0 macos-panel rounded-xl" align="end">
        <div className="p-3 border-b border-black/5 dark:border-white/10">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {tab === "you" && unreadCount > 0 && (
              <button type="button" className="text-xs text-primary underline min-h-[32px]" onClick={() => markRead.mutate(undefined)} data-testid="mark-all-read">
                Mark all read
              </button>
            )}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-xs">
            {([["you", `For you${unreadCount ? ` (${unreadCount})` : ""}`], ["activity", "Activity"]] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                data-testid={`notif-tab-${id}`}
                className={cn("rounded-md py-1.5 min-h-[32px] font-medium transition-colors", tab === id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <ScrollArea className="h-[340px]">
          {tab === "you" ? (
            loadingMine ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
            ) : items.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground" data-testid="notifications-empty">Nothing for you yet. Leave, work-from-home and overtime updates will show up here.</div>
            ) : (
              <div className="divide-y divide-black/5 dark:divide-white/10">
                {items.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => openItem(n)}
                    className={cn("w-full text-left p-3 hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex gap-3 min-h-[56px]", !n.isRead && "bg-primary/[0.06]")}
                    data-testid={`notification-${n.id}`}
                  >
                    <div className="mt-0.5 shrink-0">{notificationIcon(n)}</div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm break-words", n.isRead ? "font-medium" : "font-semibold")}>{n.title}</p>
                      {n.message && <p className="text-xs text-muted-foreground break-words line-clamp-3">{n.message}</p>}
                      <p className="text-[11px] text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
                    </div>
                    {!n.isRead && <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" aria-label="Unread" />}
                  </button>
                ))}
              </div>
            )
          ) : loadingActivity ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
          ) : activities.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No recent activity</div>
          ) : (
            <div className="divide-y divide-black/5 dark:divide-white/10">
              {(activities as ActivityLog[]).map((activity) => (
                <div key={activity.id} className="p-3" data-testid={`activity-${activity.id}`}>
                  <div className="flex gap-3">
                    <div className="mt-0.5">{getActivityIcon(activity.entityType, activity.action)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium break-words">{activity.details}</p>
                      <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
