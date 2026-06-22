import { KanbanBoard } from "@/components/KanbanBoard";
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Loader2, X, Search, List, LayoutGrid, Clock, AlertTriangle, CheckCircle2, User, Receipt } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, differenceInHours } from "date-fns";
import { getStoryBottleneck } from "@/lib/bottleneck";

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
  cardClass: string;
  borderColor?: string;
  strip: string;
  badge?: { className: string; icon: React.ReactNode; label: string };
  dateClass: string;
  titleClass: string;
}> = {
  done: {
    cardClass: "opacity-70",
    strip: "bg-gray-300",
    dateClass: "text-muted-foreground",
    titleClass: "line-through text-muted-foreground",
  },
  none: {
    cardClass: "",
    strip: "bg-transparent",
    dateClass: "text-muted-foreground",
    titleClass: "",
  },
  safe: {
    cardClass: "",
    borderColor: "#6ee7b7",
    strip: "bg-emerald-400",
    dateClass: "text-emerald-600",
    titleClass: "",
  },
  warning: {
    cardClass: "animate-deadline-blink-orange",
    borderColor: "#fb923c",
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
    cardClass: "animate-deadline-blink-red",
    borderColor: "#f87171",
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
    cardClass: "bg-red-50/40",
    borderColor: "#f87171",
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

const BOARD_COLUMNS: KanbanStatus[] = ['To Do', 'In Progress', 'Blocked', 'Review', 'Done'];

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
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [activeStatusTab, setActiveStatusTab] = useState<KanbanStatus>('In Progress');

  const clientMap = useMemo(() => {
    return new Map(clients.map((c: any) => [c.id, c.name]));
  }, [clients]);

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

  // Unique assignee names from the internal team panel
  const uniqueAssigneeNames = useMemo(() => {
    const names = users.map((u: any) => `${u.firstName || ''} ${u.lastName || ''}`.trim()).filter(Boolean);
    return Array.from(new Set(names)) as string[];
  }, [users]);

  // Count stories per client
  const storiesCountPerClient = useMemo(() => {
    const counts: Record<string, number> = {};
    stories.forEach((s: Story) => {
      counts[s.clientId] = (counts[s.clientId] || 0) + 1;
    });
    return counts;
  }, [stories]);

  // Helper to check if a story matches a user's name case-insensitively
  const matchesUser = (storyPerson: string | null | undefined, user: any) => {
    if (!storyPerson) return false;
    const personNorm = storyPerson.toLowerCase().replace(/\s+/g, ' ').trim();
    const userFullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().replace(/\s+/g, ' ').trim();
    const userFirst = (user.firstName || '').toLowerCase().trim();
    const userLast = (user.lastName || '').toLowerCase().trim();

    if (personNorm === userFullName) return true;
    if (personNorm === userFirst) return true;
    if (userLast && personNorm === userLast) return true;
    if (personNorm.includes(userFirst) && userFirst.length > 2) return true;
    if (userFullName.includes(personNorm) && personNorm.length > 2) return true;
    return false;
  };

  // Count stories per assignee
  const storiesCountPerAssignee = useMemo(() => {
    const counts: Record<string, number> = {};
    uniqueAssigneeNames.forEach((name) => {
      const user = users.find((u: any) => `${u.firstName || ''} ${u.lastName || ''}`.trim() === name);
      if (user) {
        const matchingStories = stories.filter(s => 
          s.assignedTo === user.id || matchesUser(s.person, user)
        );
        counts[name] = matchingStories.length;
      } else {
        counts[name] = 0;
      }
    });
    return counts;
  }, [stories, uniqueAssigneeNames, users]);

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
      if (filterAssigneeNames.length > 0) {
        const hasMatchingAssignee = filterAssigneeNames.some(name => {
          const user = users.find((u: any) => `${u.firstName || ''} ${u.lastName || ''}`.trim() === name);
          if (!user) return false;
          return story.assignedTo === user.id || matchesUser(story.person, user);
        });
        if (!hasMatchingAssignee) return false;
      }
      return true;
    });
  }, [stories, filterClientIds, filterAssigneeNames, users]);

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

          {/* VIEW MODE TOGGLE */}
          <div className="flex border border-border rounded-lg p-0.5 bg-muted/30 shrink-0">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8 px-3 gap-1.5 text-xs font-medium"
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">List</span>
            </Button>
            <Button
              variant={viewMode === 'board' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('board')}
              className="h-8 px-3 gap-1.5 text-xs font-medium"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Board</span>
            </Button>
          </div>

          <Button
            className="flex-1 sm:flex-none gap-2 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-white shrink-0"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add Story
          </Button>
        </div>
      </div>

      {/* RENDER VIEW */}
      {viewMode === 'list' ? (
        <Tabs value={activeStatusTab} onValueChange={(val) => setActiveStatusTab(val as KanbanStatus)} className="w-full space-y-4">
          <TabsList className="mb-2 bg-muted/40 w-full sm:w-auto overflow-x-auto justify-start h-auto p-1 gap-1">
            {BOARD_COLUMNS.map(col => {
              const count = filteredStories.filter(s => s.status === col).length;
              return (
                <TabsTrigger key={col} value={col} className="data-[state=active]:bg-background py-1.5 px-3 text-xs sm:text-sm font-medium rounded-md gap-2 shrink-0">
                  {col}
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-muted/80 text-muted-foreground font-normal rounded-full">
                    {count}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {BOARD_COLUMNS.map(col => {
            const statusStories = filteredStories.filter(s => s.status === col);
            return (
              <TabsContent key={col} value={col} className="space-y-3 focus-visible:outline-none">
                {statusStories.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-xl bg-muted/5">
                    <CheckCircle2 className="h-8 w-8 text-muted-foreground/60 mb-2" />
                    <p className="text-sm font-medium text-muted-foreground">No tasks in this status</p>
                  </div>
                ) : (
                  statusStories.map(story => {
                    const deadlineStatus = getDeadlineStatus(story);
                    const deadlineStyle = DEADLINE_STYLES[deadlineStatus];
                    const bottleneck = getStoryBottleneck(story);

                    // Find user profile details
                    const matchedUser = users.find((u: any) => 
                      story.assignedTo === u.id || matchesUser(story.person, u)
                    );

                    const clientName = clientMap.get(story.clientId) || "Unknown Client";

                    return (
                      <Card 
                        key={story.id} 
                        className={`overflow-hidden transition-all duration-200 hover:shadow-md border border-border/80 ${deadlineStyle.cardClass}`}
                        style={{ borderLeftColor: deadlineStyle.borderColor, borderLeftWidth: deadlineStyle.borderColor ? '4px' : undefined }}
                      >
                        <CardContent className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          
                          {/* Task Info & Title */}
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className="bg-primary/5 text-primary text-[10px] font-semibold px-2 py-0.5">
                                {clientName}
                              </Badge>
                              <Badge className={`text-[10px] font-semibold px-2 py-0.5 ${
                                story.priority === 'High' ? 'bg-red-500/10 text-red-600 hover:bg-red-500/10' :
                                story.priority === 'Medium' ? 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/10' :
                                'bg-slate-500/10 text-slate-600 hover:bg-slate-500/10'
                              }`}>
                                {story.priority}
                              </Badge>
                              {story.tags && story.tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0.5 bg-muted text-muted-foreground font-normal">
                                  {tag}
                                </Badge>
                              ))}
                            </div>

                            <h3 
                              onClick={() => handleStoryClick(story)}
                              className={`text-sm sm:text-base font-bold text-foreground hover:text-primary hover:underline cursor-pointer transition-colors ${deadlineStyle.titleClass}`}
                            >
                              {story.title}
                            </h3>

                            {story.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 max-w-3xl">
                                {story.description}
                              </p>
                            )}
                          </div>

                          {/* Health, Due Date & Progress */}
                          <div className="flex flex-wrap items-center gap-4 lg:gap-6 shrink-0 min-w-0">
                            
                            {/* Health Alerts / Bottlenecks */}
                            {(bottleneck || deadlineStyle.badge) && (
                              <div className="flex items-center gap-2">
                                {deadlineStyle.badge && (
                                  <Badge variant="outline" className={`text-[10px] font-semibold h-6 ${deadlineStyle.badge.className}`}>
                                    {deadlineStyle.badge.icon}
                                    {deadlineStyle.badge.label}
                                  </Badge>
                                )}
                                {bottleneck && (
                                  <Badge 
                                    variant="outline" 
                                    className={`text-[10px] font-semibold h-6 gap-1 ${
                                      bottleneck.severity === 'high' ? 'bg-red-100 text-red-700 border-red-200' :
                                      bottleneck.severity === 'medium' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                      'bg-blue-100 text-blue-700 border-blue-200'
                                    }`}
                                  >
                                    <AlertTriangle className="h-3 w-3" />
                                    {bottleneck.type}
                                  </Badge>
                                )}
                              </div>
                            )}

                            {/* Due Date */}
                            <div className="flex items-center gap-1.5 text-xs">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              {story.dueDate ? (
                                <span className={deadlineStyle.dateClass}>
                                  Due {format(new Date(story.dueDate), "MMM dd, yyyy")}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">No due date</span>
                              )}
                            </div>

                            {/* Progress */}
                            {story.progressPercent !== undefined && story.progressPercent !== null && (
                              <div className="w-[120px] space-y-1">
                                <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                                  <span>Progress</span>
                                  <span>{story.progressPercent}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary rounded-full transition-all duration-300"
                                    style={{ width: `${story.progressPercent}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Assignee & Status Switcher & Action */}
                          <div className="flex items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 pt-3 lg:pt-0 shrink-0">
                            
                            {/* Assignee Info */}
                            <div className="flex items-center gap-2">
                              {matchedUser ? (
                                <>
                                  <Avatar className="h-8 w-8 border border-border shadow-sm">
                                    <AvatarImage src={matchedUser.avatarUrl || undefined} alt={`${matchedUser.firstName} ${matchedUser.lastName}`} />
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                      {matchedUser.firstName?.[0]}{matchedUser.lastName?.[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="text-left">
                                    <p className="text-xs font-bold text-foreground leading-tight">
                                      {matchedUser.firstName} {matchedUser.lastName}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground capitalize leading-tight">
                                      {matchedUser.role || 'Member'}
                                    </p>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <Avatar className="h-8 w-8 border border-dashed border-muted-foreground/30 bg-muted/20">
                                    <AvatarFallback className="text-muted-foreground text-xs">
                                      <User className="h-3.5 w-3.5" />
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="text-left">
                                    <p className="text-xs font-medium text-muted-foreground">
                                      {story.person || "Unassigned"}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground leading-tight">
                                      Legacy Name
                                    </p>
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Status Switcher Select */}
                            <div className="flex items-center gap-2">
                              <select
                                value={story.status}
                                onChange={(e) => handleStoryMove(story.id, e.target.value as KanbanStatus)}
                                className="text-xs bg-muted/40 hover:bg-muted/70 border border-border rounded-md px-2 py-1.5 focus:ring-1 focus:ring-primary outline-none cursor-pointer font-medium transition-colors"
                              >
                                {BOARD_COLUMNS.map(colName => (
                                  <option key={colName} value={colName}>{colName}</option>
                                ))}
                              </select>

                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-xs px-3"
                                onClick={() => handleStoryClick(story)}
                              >
                                View Details
                              </Button>
                            </div>

                          </div>

                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      ) : (
        <div className="overflow-x-auto pb-4 h-[calc(100vh-190px)] sm:h-[calc(100vh-220px)] min-h-[420px] sm:min-h-[500px]">
          <KanbanBoard
            stories={filteredStories}
            onStoryMove={handleStoryMove}
            onStoryClick={handleStoryClick}
            clients={clients}
          />
        </div>
      )}

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
