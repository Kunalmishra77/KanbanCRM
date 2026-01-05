import { Draggable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Paperclip, Clock } from "lucide-react";
import { Story, USERS } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface StoryCardProps {
  story: Story;
  index: number;
  onClick: (story: Story) => void;
  clientName?: string;
}

export function StoryCard({ story, index, onClick, clientName }: StoryCardProps) {
  const assignee = USERS.find(u => u.id === story.assignedTo);

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
            snapshot.isDragging ? "z-50 rotate-2 scale-105 opacity-90" : ""
          )}
          onClick={() => onClick(story)}
        >
          <Card className={cn(
            "macos-card border-none cursor-pointer hover:shadow-md transition-all duration-200 group-active:cursor-grabbing",
            snapshot.isDragging ? "shadow-xl ring-2 ring-primary/50" : ""
          )}>
            <CardContent className="p-4 space-y-3">
              {/* Company Name - Primary Label */}
              {clientName && (
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-[11px] px-2 py-0.5 font-semibold hover:bg-primary/10">
                    {clientName}
                  </Badge>
                </div>
              )}

              {/* Header Tags */}
              <div className="flex justify-between items-start">
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
              </div>

              {/* Title */}
              <h4 className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors">
                {story.title}
              </h4>

              {/* Footer Meta */}
              <div className="flex items-center justify-between pt-2 border-t border-black/[0.03]">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className={cn(
                    "flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-colors",
                    new Date(story.dueDate) < new Date() ? "bg-red-50 text-red-600" : "bg-transparent"
                  )}>
                    <Clock className="h-3 w-3" />
                    <span>{format(new Date(story.dueDate), "MMM d")}</span>
                  </div>
                </div>

                {assignee && (
                  <Avatar className="h-6 w-6 ring-2 ring-white shadow-sm">
                    <AvatarImage src={assignee.avatarUrl} />
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">{assignee.name.charAt(0)}</AvatarFallback>
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
