import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { Loader2, Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useClients, useCreateStory } from "@/lib/queries";
import { useAuth } from "@/lib/auth";

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
  const [date, setDate] = useState<Date>();

  useEffect(() => {
    if (open && defaultClientId) {
      setClientId(defaultClientId);
    }
  }, [open, defaultClientId]);

  const resetForm = () => {
    setClientId(defaultClientId || "");
    setTitle("");
    setDescription("");
    setPriority("Medium");
    setAssignee("");
    setDate(undefined);
  };

  const handleSubmit = () => {
    if (!clientId || !title.trim()) {
      return;
    }

    const creatorName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';

    createStory({
      clientId,
      title: title.trim(),
      description: description.trim(),
      priority,
      status: "To Do",
      person: assignee.trim() || creatorName || "Unassigned",
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
              <Input 
                placeholder="Enter name..."
                className="macos-input"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                data-testid="input-story-assignee"
              />
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
              <Popover>
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
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
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
