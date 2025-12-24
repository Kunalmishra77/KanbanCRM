import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState, useEffect } from "react";
import { Loader2, Calendar as CalendarIcon, Check, ChevronsUpDown, User } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useClients, useCreateStory } from "@/lib/queries";
import { useAuth } from "@/lib/auth";

const ASSIGNEES_STORAGE_KEY = 'agentix-assignees';

function getStoredAssignees(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(ASSIGNEES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addAssignee(name: string) {
  if (typeof window === 'undefined') return;
  if (!name.trim()) return;
  try {
    const assignees = getStoredAssignees();
    if (!assignees.includes(name.trim())) {
      assignees.unshift(name.trim());
      localStorage.setItem(ASSIGNEES_STORAGE_KEY, JSON.stringify(assignees.slice(0, 50)));
    }
  } catch {
    // Ignore storage errors
  }
}

type ClientData = {
  id: string;
  name: string;
};

interface CreateStoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultClientId?: string;
}

export function CreateStoryModal({ open, onOpenChange, defaultClientId }: CreateStoryModalProps) {
  const { data: clients = [] } = useClients();
  const { mutate: createStory, isPending } = useCreateStory();
  const { user } = useAuth();
  
  const [clientId, setClientId] = useState(defaultClientId || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [assignee, setAssignee] = useState("");
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [storedAssignees, setStoredAssignees] = useState<string[]>([]);
  const [date, setDate] = useState<Date>();
  const [dateOpen, setDateOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setStoredAssignees(getStoredAssignees());
      if (defaultClientId) {
        setClientId(defaultClientId);
      }
    }
  }, [open, defaultClientId]);

  const resetForm = () => {
    setClientId(defaultClientId || "");
    setTitle("");
    setDescription("");
    setPriority("Medium");
    setAssignee("");
    setAssigneeSearch("");
    setDate(undefined);
  };

  const handleSubmit = () => {
    if (!clientId || !title.trim()) {
      return;
    }

    const creatorName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';

    const finalAssignee = assignee.trim() || creatorName || "Unassigned";
    
    if (assignee.trim()) {
      addAssignee(assignee.trim());
    }

    createStory({
      clientId,
      title: title.trim(),
      description: description.trim(),
      priority,
      status: "To Do",
      person: finalAssignee,
      assignedTo: null,
      estimatedEffortHours: 0,
      progressPercent: 0,
      dueDate: date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      tags: [],
    }, {
      onSuccess: () => {
        resetForm();
        onOpenChange(false);
      }
    });
  };

  const isValid = clientId && title.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="macos-panel border-none sm:max-w-[600px] p-0 overflow-hidden">
        <div className="p-6 border-b border-black/5 bg-white/50">
          <DialogHeader>
            <DialogTitle className="text-xl">Create New Story</DialogTitle>
            <DialogDescription>Add a new task to track progress.</DialogDescription>
          </DialogHeader>
        </div>
        
        <div className="p-6 space-y-6 bg-white/30">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Client *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="macos-input" data-testid="select-story-client">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.length === 0 ? (
                    <div className="py-2 px-3 text-sm text-muted-foreground">
                      No clients available. Create a client first.
                    </div>
                  ) : (
                    clients.map((client: ClientData) => (
                      <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={assigneeOpen}
                    className="w-full justify-between macos-input border-input font-normal"
                    data-testid="select-story-assignee"
                  >
                    <span className={cn(!assignee && "text-muted-foreground")}>
                      {assignee || "Select or type name..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Search or type new..."
                      value={assigneeSearch}
                      onValueChange={(value) => {
                        setAssigneeSearch(value);
                        setAssignee(value);
                      }}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {assigneeSearch ? (
                          <div 
                            className="py-3 px-2 text-sm cursor-pointer hover:bg-accent rounded-sm"
                            onClick={() => {
                              setAssignee(assigneeSearch);
                              setAssigneeOpen(false);
                            }}
                          >
                            <User className="inline-block h-4 w-4 mr-2" />
                            Add "{assigneeSearch}"
                          </div>
                        ) : (
                          "Type a name to add"
                        )}
                      </CommandEmpty>
                      {storedAssignees.length > 0 && (
                        <CommandGroup heading="Recent Assignees">
                          {storedAssignees
                            .filter(name => name.toLowerCase().includes(assigneeSearch.toLowerCase()))
                            .slice(0, 8)
                            .map((name) => (
                              <CommandItem
                                key={name}
                                value={name}
                                onSelect={() => {
                                  setAssignee(name);
                                  setAssigneeSearch(name);
                                  setAssigneeOpen(false);
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", assignee === name ? "opacity-100" : "opacity-0")} />
                                <User className="mr-2 h-4 w-4 text-muted-foreground" />
                                {name}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Title *</Label>
            <Input 
              placeholder="e.g., Update Q3 Financial Reports"
              className="macos-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="input-story-title"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea 
              placeholder="Add details about this task..."
              className="macos-input min-h-[100px] resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-testid="input-story-description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="macos-input" data-testid="select-story-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal macos-input border-input",
                      !date && "text-muted-foreground"
                    )}
                    data-testid="button-story-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "MMMM d, yyyy") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => {
                      setDate(newDate);
                      setDateOpen(false);
                    }}
                    initialFocus
                    className="rounded-md border-0"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 border-t border-black/5 bg-white/50">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-story"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!isValid || isPending}
            className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
            data-testid="button-create-story"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Story"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
