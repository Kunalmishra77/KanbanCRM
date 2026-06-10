import { KanbanBoard } from "@/components/KanbanBoard";
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Loader2, X, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StoryModal } from "@/components/StoryModal";
import { CreateStoryModal } from "@/components/CreateStoryModal";
import { useStories, useUpdateStory, useClients, useUsers } from "@/lib/queries";
import { useSearch } from "wouter";
import { useIsOwner } from "@/lib/auth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

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
  const isOwner = useIsOwner();
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const searchString = useSearch();
  const assigneeFilter = useMemo(() => {
    const params = new URLSearchParams(searchString);
    return params.get('assignee');
  }, [searchString]);

  // Filter state
  const [filterClientIds, setFilterClientIds] = useState<string[]>([]);
  const [filterAssigneeNames, setFilterAssigneeNames] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [assigneeSearch, setAssigneeSearch] = useState("");

  // Sync assignee filter from URL query param if present
  useEffect(() => {
    if (assigneeFilter) {
      const names = assigneeFilter.split(',').map(n => decodeURIComponent(n).trim()).filter(Boolean);
      setFilterAssigneeNames(names);
    }
  }, [assigneeFilter]);

  const selectedClient = useMemo(() => {
    if (!selectedStory) return null;
    return clients.find((c: any) => c.id === selectedStory.clientId) || null;
  }, [selectedStory, clients]);

  // Unique assignee names
  const uniqueAssigneeNames = useMemo(() => {
    return Array.from(new Set(stories.map((s: Story) => s.person).filter(Boolean))) as string[];
  }, [stories]);

  // Count stories per client
  const storiesCountPerClient = useMemo(() => {
    const counts: Record<string, number> = {};
    stories.forEach((s: Story) => {
      counts[s.clientId] = (counts[s.clientId] || 0) + 1;
    });
    return counts;
  }, [stories]);

  // Count stories per assignee
  const storiesCountPerAssignee = useMemo(() => {
    const counts: Record<string, number> = {};
    stories.forEach((s: Story) => {
      if (s.person) {
        counts[s.person] = (counts[s.person] || 0) + 1;
      }
    });
    return counts;
  }, [stories]);

  const filteredClientsList = useMemo(() => {
    return clients.filter((client: any) =>
      client.name.toLowerCase().includes(clientSearch.toLowerCase())
    );
  }, [clients, clientSearch]);

  const filteredAssigneesList = useMemo(() => {
    return uniqueAssigneeNames.filter((name: string) =>
      name.toLowerCase().includes(assigneeSearch.toLowerCase())
    );
  }, [uniqueAssigneeNames, assigneeSearch]);

  // Filter stories based on selected filters
  const filteredStories = useMemo(() => {
    return stories.filter((story: Story) => {
      if (filterClientIds.length > 0 && !filterClientIds.includes(story.clientId)) return false;
      if (filterAssigneeNames.length > 0 && (!story.person || !filterAssigneeNames.includes(story.person))) return false;
      return true;
    });
  }, [stories, filterClientIds, filterAssigneeNames]);

  // Count active filters
  const activeFilterCount = filterClientIds.length + filterAssigneeNames.length;

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
    setFilterClientIds([]);
    setFilterAssigneeNames([]);
    setClientSearch("");
    setAssigneeSearch("");
  };

  const handleClientToggle = (clientId: string) => {
    setFilterClientIds(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleAssigneeToggle = (name: string) => {
    setFilterAssigneeNames(prev =>
      prev.includes(name)
        ? prev.filter(n => n !== name)
        : [...prev, name]
    );
  };

  const isAllClientsSelected = filteredClientsList.length > 0 && filteredClientsList.every(c => filterClientIds.includes(c.id));
  const isAllAssigneesSelected = filteredAssigneesList.length > 0 && filteredAssigneesList.every(name => filterAssigneeNames.includes(name));

  const handleToggleAllClients = () => {
    if (isAllClientsSelected) {
      const filteredIds = filteredClientsList.map(c => c.id);
      setFilterClientIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      const filteredIds = filteredClientsList.map(c => c.id);
      setFilterClientIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleToggleAllAssignees = () => {
    if (isAllAssigneesSelected) {
      setFilterAssigneeNames(prev => prev.filter(name => !filteredAssigneesList.includes(name)));
    } else {
      setFilterAssigneeNames(prev => Array.from(new Set([...prev, ...filteredAssigneesList])));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Global Board</h1>
          <p className="text-muted-foreground">Manage tasks across all active client accounts.</p>
        </div>
        <div className="flex w-full sm:w-auto items-center gap-3">
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
            <PopoverContent className="w-[320px] p-4 bg-background/95 backdrop-blur border border-border shadow-xl rounded-xl" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Filters</h4>
                  {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3 mr-1" />
                      Clear all
                    </Button>
                  )}
                </div>

                {/* Client Filter */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-foreground">Clients</label>
                    {filteredClientsList.length > 0 && (
                      <button
                        onClick={handleToggleAllClients}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        {isAllClientsSelected ? "Deselect All" : "Select All"}
                      </button>
                    )}
                  </div>
                  
                  {/* Client Search */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search clients..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="pl-8 h-9 text-sm bg-muted/30 focus-visible:ring-primary"
                    />
                    {clientSearch && (
                      <button
                        onClick={() => setClientSearch("")}
                        className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Scrollable list of clients with checkboxes */}
                  <ScrollArea className="h-[140px] pr-2 border rounded-md p-2 bg-muted/10">
                    {filteredClientsList.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No clients found</p>
                    ) : (
                      <div className="space-y-2">
                        {filteredClientsList.map((client: any) => {
                          const count = storiesCountPerClient[client.id] || 0;
                          return (
                            <div key={client.id} className="flex items-center justify-between space-x-2 rounded-md hover:bg-muted/30 p-1 transition-colors">
                              <label
                                htmlFor={`client-${client.id}`}
                                className="flex items-center space-x-2 text-xs font-medium leading-none cursor-pointer flex-1 select-none pr-2"
                              >
                                <Checkbox
                                  id={`client-${client.id}`}
                                  checked={filterClientIds.includes(client.id)}
                                  onCheckedChange={() => handleClientToggle(client.id)}
                                />
                                <span className="truncate">{client.name}</span>
                              </label>
                              {count > 0 && (
                                <Badge variant="secondary" className="h-5 text-[10px] px-1.5 font-normal bg-muted text-muted-foreground shrink-0">
                                  {count}
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </div>

                {/* Assignee Filter */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-foreground">Assignees</label>
                    {filteredAssigneesList.length > 0 && (
                      <button
                        onClick={handleToggleAllAssignees}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        {isAllAssigneesSelected ? "Deselect All" : "Select All"}
                      </button>
                    )}
                  </div>
                  
                  {/* Assignee Search */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search assignees..."
                      value={assigneeSearch}
                      onChange={(e) => setAssigneeSearch(e.target.value)}
                      className="pl-8 h-9 text-sm bg-muted/30 focus-visible:ring-primary"
                    />
                    {assigneeSearch && (
                      <button
                        onClick={() => setAssigneeSearch("")}
                        className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Scrollable list of assignees with checkboxes */}
                  <ScrollArea className="h-[140px] pr-2 border rounded-md p-2 bg-muted/10">
                    {filteredAssigneesList.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No assignees found</p>
                    ) : (
                      <div className="space-y-2">
                        {filteredAssigneesList.map((name: string) => {
                          const count = storiesCountPerAssignee[name] || 0;
                          return (
                            <div key={name} className="flex items-center justify-between space-x-2 rounded-md hover:bg-muted/30 p-1 transition-colors">
                              <label
                                htmlFor={`assignee-${name}`}
                                className="flex items-center space-x-2 text-xs font-medium leading-none cursor-pointer flex-1 select-none pr-2"
                              >
                                <Checkbox
                                  id={`assignee-${name}`}
                                  checked={filterAssigneeNames.includes(name)}
                                  onCheckedChange={() => handleAssigneeToggle(name)}
                                />
                                <span className="truncate">{name}</span>
                              </label>
                              {count > 0 && (
                                <Badge variant="secondary" className="h-5 text-[10px] px-1.5 font-normal bg-muted text-muted-foreground shrink-0">
                                  {count}
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
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
            className="flex-1 sm:flex-none gap-2 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-white"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add Story
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto pb-4 h-[calc(100vh-190px)] sm:h-[calc(100vh-220px)] min-h-[420px] sm:min-h-[500px]">
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
