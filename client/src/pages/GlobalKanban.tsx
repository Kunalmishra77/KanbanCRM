import { KanbanBoard } from "@/components/KanbanBoard";
import { STORIES, KanbanStatus, Story } from "@/lib/mockData";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StoryModal } from "@/components/StoryModal";

export default function GlobalKanban() {
  const [stories, setStories] = useState(STORIES);
  const { toast } = useToast();
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleStoryMove = (storyId: string, newStatus: KanbanStatus) => {
    setStories(prev => prev.map(s => s.id === storyId ? { ...s, status: newStatus } : s));
    toast({
      title: "Status Updated",
      description: `Moved story to ${newStatus}`,
    });
  };

  const handleStoryClick = (story: Story) => {
    setSelectedStory(story);
    setIsModalOpen(true);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Global Board</h1>
          <p className="text-muted-foreground mt-1">Manage all tasks across all clients.</p>
        </div>
        <Button className="gap-2 shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4" />
          Add Story
        </Button>
      </div>

      <div className="flex-1 min-h-0">
        <KanbanBoard 
          stories={stories} 
          onStoryMove={handleStoryMove} 
          onStoryClick={handleStoryClick}
        />
      </div>

      <StoryModal 
        story={selectedStory} 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
      />
    </div>
  );
}
