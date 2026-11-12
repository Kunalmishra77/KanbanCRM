import { KanbanBoard } from "@/components/KanbanBoard";
import { isAssignedTo, assigneeName } from "@/lib/assignee";
import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Loader2, X, Search, List, LayoutGrid, Clock, AlertTriangle, CheckCircle2, User, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StoryModal } from "@/components/StoryModal";
import { CreateStoryModal } from "@/components/CreateStoryModal";
import { useStories, useUpdateStory, useClients, useUsers } from "@/lib/queries";
import { useSearch } from "wouter";
import { useIsFounder, useAuth } from "@/lib/auth";
import { perms } from "@shared/roles";
import { MultiPicker } from "@/components/MultiPicker";
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
import type { Client, Story } from "@shared/schema";

type KanbanStatus = 'To Do' | 'In Progress' | 'Blocked' | 'Review' | 'Done';


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
    dateClass: "text-emerald-600 dark:text-emerald-300",
    titleClass: "",
  },
  warning: {
    cardClass: "animate-deadline-blink-orange",
    borderColor: "#fb923c",
    strip: "bg-orange-400",
    badge: {
      className: "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-500/40",
      icon: <Clock className="h-2.5 w-2.5 mr-1" />,
      label: "Due Soon",
    },
    dateClass: "text-orange-600 dark:text-orange-300 font-semibold",
    titleClass: "",
  },
  critical: {
    cardClass: "animate-deadline-blink-red",
    borderColor: "#f87171",
    strip: "bg-red-500",
    badge: {
      className: "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/40",
      icon: <AlertTriangle className="h-2.5 w-2.5 mr-1" />,
      label: "<24h",
    },
    dateClass: "text-red-600 dark:text-red-300 font-bold",
    titleClass: "",
  },
  overdue: {
    cardClass: "bg-red-50/40 dark:bg-red-500/20",
    borderColor: "#f87171",
    strip: "bg-red-600",
    badge: {
      className: "bg-red-200 dark:bg-red-500/25 text-red-800 dark:text-red-300 border-red-300 dark:border-red-500/40",
      icon: <AlertTriangle className="h-2.5 w-2.5 mr-1" />,
      label: "Overdue",
    },
    dateClass: "text-red-700 dark:text-red-300 font-bold",
    titleClass: "text-red-900 dark:text-red-300",
  },
};

const BOARD_COLUMNS: KanbanStatus[] = ['To Do', 'In Progress', 'Blocked', 'Review', 'Done'];

export default function GlobalKanban() {
  const { data: stories = [], isLoading } = useStories() as { data: Story[]; isLoading: boolean };
  const { data: clients = [] } = useClients() as { data: Client[] };
  const { data: users = [] } = useUsers();
  const { mutate: updateStory } = useUpdateStory();
  const { toast } = useToast();
  const isFounder = useIsFounder();
  const { user: me } = useAuth();
  // Founders and the chief of staff see everyone's stories; everyone else only gets their own from the server
  const seesAllStories = perms.viewAllStories(me);
  // A team lead gets their team's stories from the server and may filter them by person
  const myTeam = perms.isTeamLead(me) ? ((me as any)?.team as string | null) || null : null;
  const canPickPeople = seesAllStories || !!myTeam;
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [activeStatusTab, setActiveStatusTab] = useState<KanbanStatus>('In Progress');
  const pickedInitialTab = useRef(false);
  useEffect(() => {
    if (pickedInitialTab.current || stories.length === 0) return;
    pickedInitialTab.current = true;
    const order: KanbanStatus[] = ['In Progress', 'To Do', 'Blocked', 'Review', 'Done'];
    const first = order.find((status) => stories.some((s) => s.status === status));
    if (first) setActiveStatusTab(first);
  }, [stories]);

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
  // Quick scope from links such as the founder overview: done | open | overdue
  const scopeParam = useMemo(() => {
    const v = new URLSearchParams(searchString).get('scope');
    return v === 'done' || v === 'open' || v === 'overdue' ? v : null;
  }, [searchString]);
  const [scope, setScope] = useState<'done' | 'open' | 'overdue' | null>(scopeParam);
  useEffect(() => { setScope(scopeParam); }, [scopeParam]);
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
    const names = users
      .filter((u: any) => seesAllStories || !myTeam || u.team === myTeam)
      .map((u: any) => `${u.firstName || ''} ${u.lastName || ''}`.trim()).filter(Boolean);
    return Array.from(new Set(names)) as string[];
  }, [users, seesAllStories, myTeam]);

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
    uniqueAssigneeNames.forEach((name) => {
      const user = users.find((u: any) => `${u.firstName || ''} ${u.lastName || ''}`.trim() === name);
      if (user) {
        const matchingStories = stories.filter(s => 
          isAssignedTo(s, user)
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
      if (scope === 'done' && story.status !== 'Done') return false;
      if (scope === 'open' && story.status === 'Done') return false;
      if (scope === 'overdue' && (story.status === 'Done' || !story.dueDate || new Date(story.dueDate).getTime() >= Date.now())) return false;
      if (filterAssigneeNames.length > 0) {
        const hasMatchingAssignee = filterAssigneeNames.some(name => {
          const user = users.find((u: any) => `${u.firstName || ''} ${u.lastName || ''}`.trim() === name);
          if (!user) return false;
          return isAssignedTo(story, user);
        });
        if (!hasMatchingAssignee) return false;
      }
      return true;
    });
  }, [stories, filterClientIds, filterAssigneeNames, users, scope]);

  // When opened with a scope, jump to the first status column that actually has matching stories
  useEffect(() => {
    if (!scope) return;
    const first = BOARD_COLUMNS.find((c) => filteredStories.some((s) => s.status === c));
    if (first) setActiveStatusTab(first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, filterAssigneeNames, stories.length]);

  // Options for the two filter dropdowns. Clients: only those that have stories on this board
  // (so an employee only sees the clients they work on), most stories first.
  const clientOptions = useMemo(() => clients
    .filter((c: any) => (storiesCountPerClient[c.id] || 0) > 0)
    .map((c: any) => ({ value: c.id, label: c.name, count: storiesCountPerClient[c.id] || 0 }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)), [clients, storiesCountPerClient]);
  const assigneeOptions = useMemo(() => uniqueAssigneeNames
    .map((name) => ({ value: name, label: name, count: storiesCountPerAssignee[name] || 0 }))
    .sort((a, b) => a.label.localeCompare(b.label)), [uniqueAssigneeNames, storiesCountPerAssignee]);

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

  // Deep link from the global search: /global-kanban?story=<id> opens that story
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("story");
    if (!id || stories.length === 0) return;
    const match = stories.find((s) => s.id === id);
    if (match) {
      setSelectedStory(match);
      setIsDetailsOpen(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [stories]);

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
            className="flex-1 sm:flex-none gap-2 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-white dark:text-primary-foreground shrink-0"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add Story
          </Button>
        </div>
      </div>

      {/* Simple filters: pick clients and (for founders / chief of staff) people */}
      <div className="flex flex-wrap items-center gap-2" data-testid="board-filters">
        <MultiPicker
          allLabel="All clients"
          noun="client"
          options={clientOptions}
          selected={filterClientIds}
          onChange={setFilterClientIds}
          testId="filter-clients"
        />
        {canPickPeople ? (
          <MultiPicker
            allLabel={seesAllStories ? "Everyone" : `Whole ${myTeam} team`}
            noun="person"
            options={assigneeOptions}
            selected={filterAssigneeNames}
            onChange={setFilterAssigneeNames}
            testId="filter-assignees"
          />
        ) : (
          <span className="inline-flex h-9 items-center rounded-lg border border-border bg-muted/40 px-3 text-sm text-muted-foreground">
            My stories only
          </span>
        )}
        {activeFilterCount > 0 && (
          <>
            <span className="text-xs text-muted-foreground">Showing {filteredStories.length} of {stories.length}</span>
            <button type="button" onClick={clearFilters} className="text-xs text-primary hover:underline">Clear</button>
          </>
        )}
      </div>

      {scope && (
        <div className="flex items-center gap-2" data-testid="scope-chip">
          <Badge variant="outline" className="gap-1.5 text-xs">
            Showing {scope === 'overdue' ? 'overdue' : scope === 'open' ? 'open' : 'finished'} stories only
          </Badge>
          <button type="button" className="text-xs text-primary underline min-h-[36px]" onClick={() => setScope(null)} data-testid="scope-clear">Show all</button>
        </div>
      )}

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
                    // The deadline badge already says "Overdue"; don't show the same thing twice
                    const visibleBottleneck = bottleneck && !(bottleneck.type === 'Overdue' && deadlineStyle.badge) ? bottleneck : null;

                    // Find user profile details
                    const matchedUser = users.find((u: any) => 
                      isAssignedTo(story, u)
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
                                story.priority === 'High' ? 'bg-red-500/10 text-red-600 dark:text-red-300 hover:bg-red-500/10' :
                                story.priority === 'Medium' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-300 hover:bg-amber-500/10' :
                                'bg-slate-500/10 text-foreground/80 hover:bg-slate-500/10'
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
                            {(visibleBottleneck || deadlineStyle.badge) && (
                              <div className="flex items-center gap-2">
                                {deadlineStyle.badge && (
                                  <Badge variant="outline" className={`text-[10px] font-semibold h-6 ${deadlineStyle.badge.className}`}>
                                    {deadlineStyle.badge.icon}
                                    {deadlineStyle.badge.label}
                                  </Badge>
                                )}
                                {visibleBottleneck && (
                                  <Badge 
                                    variant="outline" 
                                    className={`text-[10px] font-semibold h-6 gap-1 ${
                                      visibleBottleneck.severity === 'high' ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/40' :
                                      visibleBottleneck.severity === 'medium' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/40' :
                                      'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/40'
                                    }`}
                                  >
                                    <AlertTriangle className="h-3 w-3" />
                                    {visibleBottleneck.type}
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
                                      {assigneeName(story, users)}
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
