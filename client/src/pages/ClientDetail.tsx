import { useRoute } from "wouter";
import { KanbanBoard } from "@/components/KanbanBoard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowLeft, TrendingUp, DollarSign, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { StoryModal } from "@/components/StoryModal";
import { CreateStoryModal } from "@/components/CreateStoryModal";
import { useClient, useStories, useUpdateStory } from "@/lib/queries";

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

export default function ClientDetail() {
  const [match, params] = useRoute("/clients/:id");
  const { toast } = useToast();
  
  const { data: client, isLoading: isLoadingClient } = useClient(params?.id || '');
  const { data: allStories = [], isLoading: isLoadingStories } = useStories(params?.id);
  const { mutate: updateStory } = useUpdateStory();
  
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);

  if (isLoadingClient || isLoadingStories) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!client) {
    return <div className="p-10 text-center">Client not found</div>;
  }

  const handleStoryMove = (storyId: string, newStatus: KanbanStatus) => {
    updateStory({ 
      id: storyId, 
      data: { status: newStatus } 
    });
    toast({
      title: "Status Updated",
      description: `Story moved to ${newStatus}`,
    });
  };

  const handleStoryClick = (story: Story) => {
    setSelectedStory(story);
    setIsModalOpen(true);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <Link href="/clients">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
            <Badge variant="outline">{client.industry}</Badge>
            <Badge className={
               client.stage === 'Hot' ? "bg-red-500 hover:bg-red-600" :
               client.stage === 'Warm' ? "bg-orange-500 hover:bg-orange-600" :
               "bg-blue-500 hover:bg-blue-600"
            }>
              {client.stage}
            </Badge>
          </div>
          <div className="ml-auto flex gap-2">
             <Button 
               className="gap-2 shadow-lg shadow-primary/20"
               onClick={() => setIsCreateStoryOpen(true)}
               data-testid="button-add-story"
             >
               <Plus className="h-4 w-4" />
               Add Story
             </Button>
          </div>
        </div>

        <div className="flex gap-6 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">${Number(client.revenueTotal).toLocaleString()}</span> Revenue
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">{Number(client.averageProgress).toFixed(0)}%</span> Avg Progress
          </div>
        </div>
      </div>

      {/* Kanban */}
      <div className="flex-1 min-h-0">
        <KanbanBoard 
          stories={allStories} 
          onStoryMove={handleStoryMove} 
          onStoryClick={handleStoryClick}
        />
      </div>

      <StoryModal 
        story={selectedStory} 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
      />

      <CreateStoryModal
        open={isCreateStoryOpen}
        onOpenChange={setIsCreateStoryOpen}
        defaultClientId={params?.id}
      />
    </div>
  );
}
