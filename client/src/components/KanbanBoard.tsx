import { DragDropContext, Droppable, DropResult } from "@hello-pangea/dnd";
import { KanbanStatus, Story } from "@/lib/mockData";
import { StoryCard } from "./StoryCard";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface KanbanBoardProps {
  stories: Story[];
  onStoryMove: (storyId: string, newStatus: KanbanStatus) => void;
  onStoryClick: (story: Story) => void;
}

const COLUMNS: KanbanStatus[] = ['To Do', 'In Progress', 'Blocked', 'Review', 'Done'];

export function KanbanBoard({ stories, onStoryMove, onStoryClick }: KanbanBoardProps) {
  const [optimisticStories, setOptimisticStories] = useState(stories);

  // Update local state when props change
  if (stories !== optimisticStories && JSON.stringify(stories) !== JSON.stringify(optimisticStories)) {
     setOptimisticStories(stories);
  }

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStatus = destination.droppableId as KanbanStatus;
    
    // Optimistic update
    const updatedStories = optimisticStories.map(s => 
      s.id === draggableId ? { ...s, status: newStatus } : s
    );
    
    setOptimisticStories(updatedStories);
    onStoryMove(draggableId, newStatus);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex h-full gap-4 overflow-x-auto pb-4 snap-x">
        {COLUMNS.map((status) => {
          const columnStories = optimisticStories.filter(s => s.status === status);
          
          return (
            <div key={status} className="min-w-[280px] w-[320px] flex flex-col h-full snap-center">
              <div className="flex items-center justify-between mb-3 px-2">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    status === 'To Do' ? "bg-slate-400" :
                    status === 'In Progress' ? "bg-blue-500" :
                    status === 'Blocked' ? "bg-red-500" :
                    status === 'Review' ? "bg-yellow-500" :
                    "bg-green-500"
                  )} />
                  {status}
                </h3>
                <span className="bg-white/40 px-2 py-0.5 rounded-full text-xs font-medium text-muted-foreground">
                  {columnStories.length}
                </span>
              </div>
              
              <Droppable droppableId={status}>
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={cn(
                      "flex-1 rounded-xl p-2 transition-colors",
                      snapshot.isDraggingOver ? "bg-primary/5" : "bg-white/20 dark:bg-black/20"
                    )}
                  >
                    <ScrollArea className="h-full pr-2">
                      {columnStories.map((story, index) => (
                        <StoryCard 
                          key={story.id} 
                          story={story} 
                          index={index} 
                          onClick={onStoryClick}
                        />
                      ))}
                      {provided.placeholder}
                    </ScrollArea>
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
