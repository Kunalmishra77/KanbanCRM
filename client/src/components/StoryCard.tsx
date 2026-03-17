import { Draggable } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Story, USERS } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { format, differenceInHours } from "date-fns";

interface StoryCardProps {
  story: Story;
  index: number;
  onClick: (story: Story) => void;
  clientName?: string;
}

type DeadlineStatus = 'done' | 'none' | 'overdue' | 'critical' | 'warning' | 'safe';

function getDeadlineStatus(story: Story): DeadlineStatus {
  if (story.status === 'Done') return 'done';
  if (!story.dueDate) return 'none';
  const now = new Date();
  const due = new Date(story.dueDate);
  const hoursLeft = differenceInHours(due, now);
  if (hoursLeft < 0) return 'overdue';
  if (hoursLeft < 24) return 'critical';
  if (hoursLeft < 48) return 'warning';
  return 'safe';
}

const DEADLINE_STYLES: Record<DeadlineStatus, {
  card: string;
  strip: string;
  badge?: { className: string; icon: React.ReactNode; label: string };
  dateClass: string;
  titleClass: string;
}> = {
  done: {
    card: "border-none opacity-70",
    strip: "bg-gray-300",
    dateClass: "text-muted-foreground",
    titleClass: "line-through text-muted-foreground",
  },
  none: {
    card: "border-none",
    strip: "bg-transparent",
    dateClass: "text-muted-foreground",
    titleClass: "",
  },
  safe: {
    card: "border border-emerald-300",
    strip: "bg-emerald-400",
    dateClass: "text-emerald-600",
    titleClass: "",
  },
  warning: {
    card: "border-2 animate-deadline-blink-orange",
    strip: "bg-orange-400",
    badge: {
      className: "bg-orange-100 text-orange-700 border-orange-200",
      icon: <Clock className="h-2.5 w-2.5 mr-1" />,
      label: "Due Soon",
    },
    dateClass: "text-orange-600 font-semibold",
    titleClass: "",
  },
  critical: {
    card: "border-2 animate-deadline-blink-red",
    strip: "bg-red-500",
    badge: {
      className: "bg-red-100 text-red-700 border-red-200",
      icon: <AlertTriangle className="h-2.5 w-2.5 mr-1" />,
      label: "<24h",
    },
    dateClass: "text-red-600 font-bold",
    titleClass: "",
  },
  overdue: {
    card: "border border-red-400 bg-red-50/40",
    strip: "bg-red-600",
    badge: {
      className: "bg-red-200 text-red-800 border-red-300",
      icon: <AlertTriangle className="h-2.5 w-2.5 mr-1" />,
      label: "Overdue",
    },
    dateClass: "text-red-700 font-bold",
    titleClass: "text-red-900",
  },
};

export function StoryCard({ story, index, onClick, clientName }: StoryCardProps) {
  const assignee = USERS.find(u => u.id === story.assignedTo);
  const status = getDeadlineStatus(story);
  const styles = DEADLINE_STYLES[status];

  const priorityConfig = {
    Low: { color: "bg-blue-100 text-blue-700 border-blue-200", label: "Low" },
    Medium: { color: "bg-yellow-100 text-yellow-700 border-yellow-200", label: "Med" },
    High: { color: "bg-red-100 text-red-700 border-red-200", label: "High" },
  }[story.priority];

  return (
    <Draggable draggableId={story.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            "mb-3 group outline-none",
            snapshot.isDragging && "z-50 opacity-95"
          )}
          style={provided.draggableProps.style}
          onClick={() => onClick(story)}
        >
          <Card className={cn(
            "macos-card cursor-grab group-active:cursor-grabbing overflow-hidden",
            snapshot.isDragging
              ? "shadow-xl ring-2 ring-primary/30 bg-white border-none"
              : cn(styles.card, "hover:shadow-md")
          )}>
            {/* Colour strip at top */}
            {status !== 'none' && (
              <div className={cn("h-1 w-full", styles.strip)} />
            )}

            <CardContent className="p-4 space-y-3">
              {/* Company + deadline badge row */}
              <div className="flex items-center justify-between gap-2">
                {clientName && (
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-[11px] px-2 py-0.5 font-semibold hover:bg-primary/10 shrink-0">
                    {clientName}
                  </Badge>
                )}
                <div className="flex items-center gap-1 ml-auto">
                  {status === 'done' && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-gray-400" />
                  )}
                  {styles.badge && (
                    <Badge className={cn("text-[10px] px-1.5 py-0 h-5 font-semibold flex items-center", styles.badge.className)}>
                      {styles.badge.icon}
                      {styles.badge.label}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Priority + tags */}
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 border font-medium shadow-none", priorityConfig.color)}>
                  {priorityConfig.label}
                </Badge>
                {story.tags.map(tag => (
                  <span key={tag} className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-[4px] border border-black/5">
                    {tag}
                  </span>
                ))}
              </div>

              {/* Title */}
              <h4 className={cn(
                "text-sm font-semibold leading-snug transition-colors",
                styles.titleClass || "text-foreground group-hover:text-primary"
              )}>
                {story.title}
              </h4>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-black/[0.03]">
                <div className="flex items-center gap-1 text-xs">
                  {story.dueDate && (
                    <div className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-md", styles.dateClass)}>
                      <Clock className="h-3 w-3" />
                      <span>{format(new Date(story.dueDate), "MMM d")}</span>
                    </div>
                  )}
                </div>
                {assignee && (
                  <Avatar className="h-6 w-6 ring-2 ring-white shadow-sm">
                    <AvatarImage src={assignee.avatarUrl} />
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                      {assignee.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  );
}
