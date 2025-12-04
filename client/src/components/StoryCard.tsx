import { Draggable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Paperclip } from "lucide-react";
import { Story, USERS } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface StoryCardProps {
  story: Story;
  index: number;
  onClick: (story: Story) => void;
}

export function StoryCard({ story, index, onClick }: StoryCardProps) {
  const assignee = USERS.find(u => u.id === story.assignedTo);
  
  const priorityColor = {
    Low: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    Medium: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
    High: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
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
            snapshot.isDragging ? "z-50 rotate-2 scale-105" : ""
          )}
          onClick={() => onClick(story)}
        >
          <Card className={cn(
            "glass-card border-none cursor-pointer hover:shadow-md transition-all duration-200 active:cursor-grabbing",
            snapshot.isDragging ? "shadow-xl ring-2 ring-primary/50" : ""
          )}>
            <CardHeader className="p-3 pb-0 space-y-0">
              <div className="flex justify-between items-start gap-2">
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 border", priorityColor)}>
                  {story.priority}
                </Badge>
                {story.tags.length > 0 && (
                   <span className="text-[10px] text-muted-foreground truncate max-w-[80px] bg-muted/50 px-1.5 rounded-sm">
                     {story.tags[0]}
                   </span>
                )}
              </div>
              <CardTitle className="text-sm font-medium leading-tight mt-2 group-hover:text-primary transition-colors line-clamp-2">
                {story.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-2">
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(story.dueDate), "MMM d")}</span>
                  </div>
                  {/* Placeholder for attachments indicator */}
                  <div className="flex items-center gap-1">
                     <Paperclip className="h-3 w-3" />
                     <span>2</span>
                  </div>
                </div>
                
                {assignee && (
                  <Avatar className="h-6 w-6 border-2 border-white/50">
                    <AvatarImage src={assignee.avatarUrl} />
                    <AvatarFallback className="text-[10px]">{assignee.name.charAt(0)}</AvatarFallback>
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
