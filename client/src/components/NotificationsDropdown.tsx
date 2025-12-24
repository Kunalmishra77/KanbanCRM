import { useState } from "react";
import { Bell, Users, FileText, CheckCircle, Edit, Trash2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useActivityLog } from "@/lib/queries";
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

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const { data: activities = [], isLoading } = useActivityLog(20);
  
  const unreadCount = activities.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full hover:bg-black/5 relative h-9 w-9"
          data-testid="button-notifications"
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 border-2 border-white text-[10px] font-medium text-white flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 macos-panel rounded-xl" align="end">
        <div className="p-3 border-b border-black/5">
          <h3 className="font-semibold text-sm">Notifications</h3>
          <p className="text-xs text-muted-foreground">Recent activity in your workspace</p>
        </div>
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : activities.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No recent activity
            </div>
          ) : (
            <div className="divide-y divide-black/5">
              {activities.map((activity: ActivityLog) => (
                <div 
                  key={activity.id} 
                  className="p-3 hover:bg-black/5 transition-colors cursor-pointer"
                  data-testid={`notification-${activity.id}`}
                >
                  <div className="flex gap-3">
                    <div className="mt-0.5">
                      {getActivityIcon(activity.entityType, activity.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.details}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                      </p>
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
