import { KanbanBoard } from "@/components/KanbanBoard";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StoryModal } from "@/components/StoryModal";
import { CreateStoryModal } from "@/components/CreateStoryModal";
import { useStories, useUpdateStory } from "@/lib/queries";

type KanbanStatus = 'To Do' | 'In Progress' | 'Blocked' | 'Review' | 'Done';

type Story = {
  id: string;
  clientId: string;
  title: string;
  description?: string | null;
  assignedTo?: string | null;
  priority: string;
  estimatedEffortHours?: number | null;
  dueDate?: Date | string | null;
  status: string;
  progressPercent?: number | null;
  person?: string | null;
  tags?: string[] | null;
};

export default function GlobalKanban() {
  const { data: stories = [], isLoading } = useStories();
  const { mutate: updateStory } = useUpdateStory();
  const { toast } = useToast();
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const handleStoryMove = (storyId: string, newStatus: KanbanStatus) => {
    updateStory({ 
      id: storyId, 
      data: { status: newStatus } 
    });
    toast({
      title: "Status Updated",
      description: `Moved story to ${newStatus}`,
    });
  };

  const handleStoryClick = (story: Story) => {
    setSelectedStory(story);
    setIsDetailsOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Global Board</h1>
          <p className="text-muted-foreground">Manage tasks across all active client accounts.</p>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="outline" className="macos-input bg-white/50 gap-2">
             <Filter className="h-4 w-4" />
             Filter
           </Button>
           <Button 
             className="gap-2 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-white"
             onClick={() => setIsCreateOpen(true)}
           >
            <Plus className="h-4 w-4" />
            Add Story
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-transparent">
        <KanbanBoard 
          stories={stories} 
          onStoryMove={handleStoryMove} 
          onStoryClick={handleStoryClick}
        />
      </div>

      <StoryModal 
        story={selectedStory} 
        open={isDetailsOpen} 
        onOpenChange={setIsDetailsOpen} 
      />

      <CreateStoryModal 
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen} 
      />
    </div>
  );
}
