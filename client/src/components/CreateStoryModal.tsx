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
import { useClients, useCreateStory, useUsers } from "@/lib/queries";
import { useAuth, useIsFounder } from "@/lib/auth";
import { useCreateRecurringTask } from "@/lib/serviceQueries";
import { TEAMS } from "@shared/teams";
import { WEEKDAYS } from "@shared/schedule";
import { istDate } from "@shared/istDate";

// Assignee tracking now handled via User relationships directly

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
  const isFounder = useIsFounder();
  const { mutate: createRecurring, isPending: isCreatingRecurring } = useCreateRecurringTask();
  // Repeat options (founders only): none | daily | weekly | monthly
  const [repeat, setRepeat] = useState("none");
  const [weekday, setWeekday] = useState("1");
  const [monthDay, setMonthDay] = useState("1");
  const [dueTime, setDueTime] = useState("end");
  const [forTeam, setForTeam] = useState("person");
  const [team, setTeam] = useState("");
  const [excluded, setExcluded] = useState<string[]>([]); // team members who should NOT get the repeating task
  const [error, setError] = useState("");
  const { data: users = [] } = useUsers();
  const [clientId, setClientId] = useState(defaultClientId || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [assignedTo, setAssignedTo] = useState<string>("unassigned");
  const [date, setDate] = useState<Date>();
  const [dateOpen, setDateOpen] = useState(false);

  useEffect(() => {
    if (open) {
      if (defaultClientId) {
        setClientId(defaultClientId);
      }
    }
  }, [open, defaultClientId]);

  const resetForm = () => {
    setExcluded([]);
    setClientId(defaultClientId || "");
    setTitle("");
    setDescription("");
    setPriority("Medium");
    setAssignedTo("unassigned");
    setDate(undefined);
    setRepeat("none"); setWeekday("1"); setMonthDay("1"); setDueTime("end"); setForTeam("person"); setTeam(""); setError("");
  };

  const handleSubmit = () => {
    if (!clientId || !title.trim()) {
      return;
    }

    if (repeat !== "none") {
      setError("");
      if (forTeam === "team" && !team) return setError("Choose the team.");
      if (forTeam === "person" && assignedTo === "unassigned") return setError("Choose the person, or pick a whole team.");
      createRecurring({
        clientId, title: title.trim(), description: description.trim(), priority, repeat,
        weekday: repeat === "weekly" ? Number(weekday) : null,
        monthDay: repeat === "monthly" ? Number(monthDay) : null,
        dueTime: dueTime === "end" ? null : dueTime,
        startDate: istDate(),
        team: forTeam === "team" ? team : null,
        excludeIds: forTeam === "team" ? excluded : [],
        assigneeIds: forTeam === "person" ? [assignedTo] : [],
      }, { onSuccess: () => { resetForm(); onOpenChange(false); }, onError: (e: Error) => setError(e.message) });
      return;
    }

    const creatorName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';

    const finalAssignedTo = assignedTo === "unassigned" ? null : assignedTo;
    
    // Fallback logic for person field to keep legacy views working
    let personName = "Unassigned";
    if (finalAssignedTo) {
      const selectedUser = users.find((u: any) => u.id === finalAssignedTo);
      if (selectedUser) {
        personName = `${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim();
      }
    } else {
      personName = creatorName || "Unassigned";
    }

    createStory({
      clientId,
      title: title.trim(),
      description: description.trim(),
      priority,
      status: "To Do",
      person: personName,
      assignedTo: finalAssignedTo,
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
      <DialogContent className="macos-panel border-none sm:max-w-[600px] p-0 overflow-y-auto">
        <div className="p-4 sm:p-6 border-b border-black/5 dark:border-white/10 bg-white/50 dark:bg-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-xl">Create New Story</DialogTitle>
            <DialogDescription>Add a new task to track progress.</DialogDescription>
          </DialogHeader>
        </div>
        
        <div className="p-4 sm:p-6 space-y-6 bg-white/30 dark:bg-white/[0.05]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger className="macos-input" data-testid="select-story-assignee">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.firstName} {u.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          {isFounder && (
            <div className="space-y-3 rounded-xl border bg-white/50 dark:bg-white/[0.08] p-3" data-testid="repeat-section">
              <div className="space-y-2">
                <Label>Repeat</Label>
                <Select value={repeat} onValueChange={setRepeat}>
                  <SelectTrigger className="macos-input" data-testid="select-repeat"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Does not repeat (one-time task)</SelectItem>
                    <SelectItem value="daily">Every day</SelectItem>
                    <SelectItem value="weekly">Every week</SelectItem>
                    <SelectItem value="monthly">Every month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {repeat !== "none" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {repeat === "weekly" && (
                    <div className="space-y-2">
                      <Label>Day of the week</Label>
                      <Select value={weekday} onValueChange={setWeekday}>
                        <SelectTrigger className="macos-input" data-testid="select-weekday"><SelectValue /></SelectTrigger>
                        <SelectContent>{WEEKDAYS.map((d, i) => <SelectItem key={d} value={String(i)}>{d}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                  {repeat === "monthly" && (
                    <div className="space-y-2">
                      <Label>Day of the month</Label>
                      <Input type="number" min={1} max={31} className="macos-input" value={monthDay} onChange={(e) => setMonthDay(e.target.value)} data-testid="input-monthday" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Due</Label>
                    <Select value={dueTime === "end" ? "end" : "time"} onValueChange={(v) => setDueTime(v === "end" ? "end" : "19:00")}>
                      <SelectTrigger className="macos-input" data-testid="select-due-kind"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="end">End of the day</SelectItem>
                        <SelectItem value="time">At a set time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {dueTime !== "end" && (
                    <div className="space-y-2">
                      <Label>Time (India)</Label>
                      <Input type="time" className="macos-input" value={dueTime} onChange={(e) => setDueTime(e.target.value || "19:00")} data-testid="input-due-time" />
                    </div>
                  )}
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Create it for</Label>
                    <Select value={forTeam} onValueChange={setForTeam}>
                      <SelectTrigger className="macos-input" data-testid="select-for"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="person">The person chosen above</SelectItem>
                        <SelectItem value="team">Everyone in a team</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {forTeam === "team" && (
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Team</Label>
                      <Select value={team} onValueChange={(v) => { setTeam(v); setExcluded([]); }}>
                        <SelectTrigger className="macos-input" data-testid="select-team"><SelectValue placeholder="Choose a team" /></SelectTrigger>
                        <SelectContent>{TEAMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                  {forTeam === "team" && team && (
                    <div className="space-y-2 sm:col-span-2" data-testid="team-members">
                      <Label>Who gets it <span className="font-normal text-muted-foreground">(untick anyone to leave them out, e.g. the team head)</span></Label>
                      <div className="rounded-lg border border-black/10 dark:border-white/10 divide-y divide-black/5 dark:divide-white/10 max-h-48 overflow-y-auto">
                        {(users as any[]).filter((u) => u.team === team && u.userType !== "founder").map((u) => {
                          const on = !excluded.includes(u.id);
                          return (
                            <label key={u.id} className="flex items-center gap-3 px-3 min-h-11 cursor-pointer text-sm">
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-primary"
                                checked={on}
                                onChange={() => setExcluded((cur) => (on ? [...cur, u.id] : cur.filter((x) => x !== u.id)))}
                                data-testid={`member-${u.id}`}
                              />
                              <span className={on ? "" : "text-muted-foreground line-through"}>{`${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email}</span>
                            </label>
                          );
                        })}
                        {(users as any[]).filter((u) => u.team === team && u.userType !== "founder").length === 0 && (
                          <p className="px-3 py-3 text-sm text-muted-foreground">No one is on this team yet.</p>
                        )}
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground sm:col-span-2">A fresh story is created automatically on each of their working days (never on leave or days off). Unfinished ones stay open as missed.</p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            {repeat === "none" && (
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
            )}
          </div>
          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-300 font-medium" data-testid="story-error">{error}</p>}
        </div>

        <DialogFooter className="p-4 sm:p-6 border-t border-black/5 dark:border-white/10 bg-white/50 dark:bg-white/[0.08]">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-story"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!isValid || isPending || isCreatingRecurring}
            className="bg-primary hover:bg-primary/90 text-white dark:text-primary-foreground shadow-lg shadow-primary/20"
            data-testid="button-create-story"
          >
            {isPending || isCreatingRecurring ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              repeat === "none" ? "Create Story" : "Save repeating task"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
