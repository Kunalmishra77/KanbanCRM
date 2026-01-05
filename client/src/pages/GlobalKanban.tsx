import { KanbanBoard } from "@/components/KanbanBoard";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StoryModal } from "@/components/StoryModal";
import { CreateStoryModal } from "@/components/CreateStoryModal";
import { useStories, useUpdateStory, useClients, useUsers } from "@/lib/queries";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

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
  const { data: clients = [] } = useClients();
  const { data: users = [] } = useUsers();
  const { mutate: updateStory } = useUpdateStory();
  const { toast } = useToast();
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Filter state
  const [filterClientId, setFilterClientId] = useState<string | null>(null);
  const [filterAssigneeId, setFilterAssigneeId] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const selectedClient = useMemo(() => {
    if (!selectedStory) return null;
    return clients.find((c: any) => c.id === selectedStory.clientId) || null;
  }, [selectedStory, clients]);

  // Filter stories based on selected filters
  const filteredStories = useMemo(() => {
    return stories.filter((story: Story) => {
      if (filterClientId && story.clientId !== filterClientId) return false;
      if (filterAssigneeId && story.person !== filterAssigneeId) return false;
      return true;
    });
  }, [stories, filterClientId, filterAssigneeId]);

  // Count active filters
  const activeFilterCount = (filterClientId ? 1 : 0) + (filterAssigneeId ? 1 : 0);

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

  const clearFilters = () => {
    setFilterClientId(null);
    setFilterAssigneeId(null);
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
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="macos-input bg-white/50 gap-2">
                <Filter className="h-4 w-4" />
                Filter
                {activeFilterCount > 0 && (
                  <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center bg-primary text-white text-[10px]">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Filters</h4>
                  {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs">
                      <X className="h-3 w-3 mr-1" />
                      Clear all
                    </Button>
                  )}
                </div>

                {/* Client Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Client</label>
                  <Select
                    value={filterClientId || "all"}
                    onValueChange={(value) => {
                      setFilterClientId(value === "all" ? null : value);
                      setIsFilterOpen(false);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All clients" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All clients</SelectItem>
                      {clients.map((client: any) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Assignee Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Assignee</label>
                  <Select
                    value={filterAssigneeId || "all"}
                    onValueChange={(value) => {
                      setFilterAssigneeId(value === "all" ? null : value);
                      setIsFilterOpen(false);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All assignees" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All assignees</SelectItem>
                      {/* Get unique assignee names from stories */}
                      {(Array.from(new Set(stories.map((s: Story) => s.person).filter(Boolean))) as string[])
                        .map((personName) => (
                          <SelectItem key={personName} value={personName}>
                            {personName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Filter summary */}
                {activeFilterCount > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      Showing {filteredStories.length} of {stories.length} stories
                    </p>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
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
          stories={filteredStories}
          onStoryMove={handleStoryMove}
          onStoryClick={handleStoryClick}
          clients={clients}
        />
      </div>

      <StoryModal
        story={selectedStory}
        client={selectedClient}
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
