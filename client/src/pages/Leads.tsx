import { useState, useRef, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useLeads, useCreateLead, useUpdateLead, useDeleteLead, useCreateClient, useLeadComments, useCreateLeadComment } from "@/lib/queries";
import { useIsOwner, useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, MoreHorizontal, Trash2, Pencil, Loader2, Trophy, IndianRupee, ArrowRightLeft, Send, MessageSquare, Briefcase, List, LayoutGrid, Mail, Phone, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const LEAD_STAGES = ['New', 'Contacted', 'Proposal Sent', 'Negotiation', 'Hold', 'Won', 'Lost'] as const;
type LeadStage = typeof LEAD_STAGES[number];

const INDUSTRIES = [
  "Technology", "Finance", "Healthcare", "Retail", "Manufacturing",
  "Media", "Consulting", "Real Estate", "Education", "SaaS", "Logistics", "Other"
];

const STAGE_COLORS: Record<LeadStage, string> = {
  New: "bg-blue-500/10 text-blue-600 border-blue-200",
  Contacted: "bg-purple-500/10 text-purple-600 border-purple-200",
  "Proposal Sent": "bg-orange-500/10 text-orange-600 border-orange-200",
  Negotiation: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  Hold: "bg-amber-500/10 text-amber-700 border-amber-200",
  Won: "bg-green-500/10 text-green-600 border-green-200",
  Lost: "bg-gray-500/10 text-gray-600 border-gray-200",
};

const STAGE_HEADER_COLORS: Record<LeadStage, string> = {
  New: "border-t-blue-500",
  Contacted: "border-t-purple-500",
  "Proposal Sent": "border-t-orange-500",
  Negotiation: "border-t-yellow-500",
  Hold: "border-t-amber-500",
  Won: "border-t-green-500",
  Lost: "border-t-gray-400",
};

type Lead = {
  id: string;
  name: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  industry?: string | null;
  stage: string;
  estimatedValue?: string | number | null;
  notes?: string | null;
  updatedAt?: string | Date;
  createdAt?: string | Date;
};

type LeadForm = {
  name: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  industry: string;
  stage: LeadStage;
  estimatedValue: string;
  notes: string;
};

const defaultForm: LeadForm = {
  name: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  industry: "",
  stage: "New",
  estimatedValue: "",
  notes: "",
};

function LeadCommentsTab({ leadId }: { leadId: string }) {
  const { data: comments = [], isLoading } = useLeadComments(leadId);
  const { mutate: createComment, isPending } = useCreateLeadComment();
  const [newComment, setNewComment] = useState("");

  const handlePost = () => {
    if (!newComment.trim()) return;
    createComment({ leadId, body: newComment.trim() }, {
      onSuccess: () => setNewComment("")
    });
  };

  return (
    <div className="flex flex-col h-[400px]">
      <ScrollArea className="flex-1 pr-4 mb-4">
        {isLoading ? (
          <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : comments.length === 0 ? (
          <div className="text-center text-muted-foreground p-4 text-sm">No notes yet. Be the first to add one!</div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment: any) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarFallback>{comment.authorName?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{comment.authorName}</p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(comment.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm bg-background/90 text-foreground p-3 rounded-md border shadow-sm whitespace-pre-wrap">
                    {comment.body}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
      <div className="flex gap-2 items-end border-t border-border pt-4">
        <Textarea
          placeholder="Add a note or update..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="min-h-[60px] resize-none bg-background/50"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handlePost();
            }
          }}
        />
        <Button onClick={handlePost} disabled={isPending || !newComment.trim()} className="h-[60px] w-[60px] shrink-0 rounded-xl">
          {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </Button>
      </div>
    </div>
  );
}

export default function Leads() {
  const { data: leads = [], isLoading } = useLeads();
  const { mutate: createLead, isPending: isCreating } = useCreateLead();
  const { mutate: updateLead, isPending: isUpdating } = useUpdateLead();
  const { mutate: deleteLead } = useDeleteLead();
  const { mutate: createClient, isPending: isConverting } = useCreateClient();
  const isOwner = useIsOwner();
  const { user } = useAuth();
  const { toast } = useToast();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [activeStage, setActiveStage] = useState<LeadStage>('New');

  const borderColors: Record<LeadStage, string> = {
    New: "#3b82f6",
    Contacted: "#a855f7",
    "Proposal Sent": "#f97316",
    Negotiation: "#eab308",
    Hold: "#f59e0b",
    Won: "#22c55e",
    Lost: "#9ca3af",
  };
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
  const [form, setForm] = useState<LeadForm>(defaultForm);
  const [convertForm, setConvertForm] = useState({
    name: '',
    industry: '',
    stage: 'Hot',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    expectedRevenue: '',
    notes: '',
  });

  const [localLeads, setLocalLeads] = useState<Lead[]>([]);
  const pendingMoves = useRef<Set<string>>(new Set());

  const clickStart = useRef({ x: 0, y: 0, time: 0 });
  const isMouseDownOnCard = useRef(false);

  const handleStart = (clientX: number, clientY: number) => {
    clickStart.current = { x: clientX, y: clientY, time: Date.now() };
    isMouseDownOnCard.current = true;
  };

  const handleEnd = (clientX: number, clientY: number, lead: Lead) => {
    if (!isMouseDownOnCard.current) return;
    isMouseDownOnCard.current = false;

    const deltaX = Math.abs(clientX - clickStart.current.x);
    const deltaY = Math.abs(clientY - clickStart.current.y);
    const deltaTime = Date.now() - clickStart.current.time;
    if (deltaX < 5 && deltaY < 5 && deltaTime < 300) {
      openEditModal(lead);
    }
  };

  useEffect(() => {
    setLocalLeads(prevLocal => {
      return leads.map((lead: Lead) => {
        if (pendingMoves.current.has(lead.id)) {
          const localVersion = prevLocal.find(l => l.id === lead.id);
          if (localVersion) {
            if (localVersion.stage === lead.stage) {
              pendingMoves.current.delete(lead.id);
            }
            return localVersion;
          }
        }
        return lead;
      });
    });
  }, [leads]);

  const leadsByStage = LEAD_STAGES.reduce((acc, stage) => {
    acc[stage] = localLeads.filter((l: Lead) => l.stage === stage);
    return acc;
  }, {} as Record<LeadStage, Lead[]>);

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    
    const newStage = destination.droppableId as LeadStage;
    pendingMoves.current.add(draggableId);
    
    setLocalLeads(prev => prev.map(l => l.id === draggableId ? { ...l, stage: newStage } : l));
    updateLead({ id: draggableId, data: { stage: newStage } });
    
    toast({
      title: "Status Updated",
      description: `Moved lead to ${newStage}`,
    });
  };

  const openAddModal = () => {
    setForm(defaultForm);
    setEditingLead(null);
    setIsAddOpen(true);
  };

  const openEditModal = (lead: Lead) => {
    setEditingLead(lead);
    setForm({
      name: lead.name,
      contactName: lead.contactName || "",
      contactEmail: lead.contactEmail || "",
      contactPhone: lead.contactPhone || "",
      industry: lead.industry || "",
      stage: (LEAD_STAGES.includes(lead.stage as LeadStage) ? lead.stage : "New") as LeadStage,
      estimatedValue: lead.estimatedValue ? String(lead.estimatedValue) : "",
      notes: lead.notes || "",
    });
    setIsAddOpen(true);
  };

  const openConvertModal = (lead: Lead) => {
    setConvertingLead(lead);
    setConvertForm({
      name: lead.name,
      industry: lead.industry || '',
      stage: 'Hot',
      contactName: lead.contactName || '',
      contactEmail: lead.contactEmail || '',
      contactPhone: lead.contactPhone || '',
      expectedRevenue: lead.estimatedValue ? String(lead.estimatedValue) : '',
      notes: lead.notes || '',
    });
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast({ title: "Company name is required", variant: "destructive" });
      return;
    }
    const data = {
      name: form.name.trim(),
      contactName: form.contactName || null,
      contactEmail: form.contactEmail || null,
      contactPhone: form.contactPhone || null,
      industry: form.industry || null,
      stage: form.stage,
      estimatedValue: form.estimatedValue ? form.estimatedValue : null,
      notes: form.notes || null,
    };
    if (editingLead) {
      updateLead({ id: editingLead.id, data }, { onSuccess: () => setIsAddOpen(false) });
    } else {
      createLead(data, { onSuccess: () => setIsAddOpen(false) });
    }
  };

  const handleConvert = () => {
    if (!convertingLead || !user?.id) return;
    if (!convertForm.name.trim() || !convertForm.industry) {
      toast({ title: "Company name and industry are required", variant: "destructive" });
      return;
    }
    const revenueValue = parseFloat(convertForm.expectedRevenue.replace(/[^0-9.]/g, '')) || 0;
    createClient({
      name: convertForm.name.trim(),
      industry: convertForm.industry,
      stage: convertForm.stage,
      ownerId: user.id,
      averageProgress: '0',
      expectedRevenue: revenueValue.toString(),
      revenueTotal: '0',
      notes: convertForm.notes.trim() || null,
      contactName: convertForm.contactName.trim() || null,
      contactEmail: convertForm.contactEmail.trim() || null,
      contactPhone: convertForm.contactPhone.trim() || null,
    }, {
      onSuccess: () => {
        // Delete lead since it is now a client
        deleteLead(convertingLead.id);
        setConvertingLead(null);
        toast({ title: '🎉 Lead converted!', description: `${convertForm.name} is now a client.` });
      }
    });
  };

  const handleDelete = () => {
    if (!leadToDelete) return;
    deleteLead(leadToDelete.id, {
      onSuccess: () => {
        setLeadToDelete(null);
        setEditingLead(null);
        setIsAddOpen(false);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Lead Pipeline</h1>
          <p className="text-muted-foreground mt-1">
            Track your leads from first contact to close. {leads.length} total leads.
          </p>
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

          {isOwner && (
            <Button className="gap-2 shadow-lg shadow-primary/20 shrink-0" onClick={openAddModal}>
              <Plus className="h-4 w-4" />
              Add Lead
            </Button>
          )}
        </div>
      </div>

      {/* RENDER VIEW */}
      {viewMode === 'list' ? (
        <Tabs value={activeStage} onValueChange={(val) => setActiveStage(val as LeadStage)} className="w-full space-y-4">
          <TabsList className="mb-2 bg-muted/40 w-full overflow-x-auto justify-start h-auto p-1 gap-1">
            {LEAD_STAGES.map(stage => {
              const count = leadsByStage[stage]?.length || 0;
              return (
                <TabsTrigger key={stage} value={stage} className="data-[state=active]:bg-background py-1.5 px-3 text-xs sm:text-sm font-medium rounded-md gap-2 shrink-0">
                  {stage}
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-muted/80 text-muted-foreground font-normal rounded-full">
                    {count}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {LEAD_STAGES.map(stage => {
            const stageLeads = leadsByStage[stage] || [];
            return (
              <TabsContent key={stage} value={stage} className="space-y-3 focus-visible:outline-none">
                {stageLeads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 border border-dashed rounded-xl bg-muted/5">
                    <Trophy className="h-8 w-8 text-muted-foreground/60 mb-2" />
                    <p className="text-sm font-medium text-muted-foreground">No leads in this stage</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 w-full">
                    {stageLeads.map(lead => {
                      const borderColor = borderColors[stage as LeadStage];
                      return (
                        <Card 
                          key={lead.id} 
                          className="overflow-hidden transition-all duration-200 hover:shadow-md border border-border/80"
                          style={{ borderLeftColor: borderColor, borderLeftWidth: '4px' }}
                        >
                          <CardContent className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                            
                            {/* Lead Identity & Industry */}
                            <div className="flex items-center gap-4 min-w-[240px] max-w-[340px] shrink-0">
                              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/15 to-violet-500/15 flex items-center justify-center border border-white/20 shrink-0">
                                <Briefcase className="h-5 w-5 text-primary" />
                              </div>
                              <div className="space-y-1 truncate">
                                <div className="flex items-center gap-2">
                                  <h3 
                                    onClick={() => openEditModal(lead)}
                                    className="font-bold text-base text-foreground truncate hover:text-primary cursor-pointer hover:underline transition-all"
                                  >
                                    {lead.name}
                                  </h3>
                                  {lead.stage === "Won" && (
                                    <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] font-semibold gap-1">
                                      <Trophy className="h-2.5 w-2.5" />
                                      Won
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  {lead.industry && (
                                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-0 bg-primary/5 text-primary font-semibold">
                                      {lead.industry}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Contact Details */}
                            <div className="flex-1 min-w-[220px] max-w-[400px] flex flex-col sm:flex-row gap-4 sm:gap-6">
                              <div className="space-y-1.5">
                                {lead.contactName && (
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <User className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                                    <span className="font-semibold text-foreground truncate">{lead.contactName}</span>
                                  </div>
                                )}
                                {lead.contactEmail && (
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Mail className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                                    <span className="truncate text-foreground">{lead.contactEmail}</span>
                                  </div>
                                )}
                              </div>
                              <div className="space-y-1.5">
                                {lead.contactPhone && (
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Phone className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                                    <span className="text-foreground">{lead.contactPhone}</span>
                                  </div>
                                )}
                                {lead.updatedAt && (
                                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/60 w-fit px-2 py-0.5 rounded-full font-medium">
                                    <MessageSquare className="h-3 w-3 text-primary/70 shrink-0" />
                                    <span>Last Contact: {new Date(lead.updatedAt).toLocaleDateString()}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Estimated Value */}
                            <div className="min-w-[150px] shrink-0">
                              {lead.estimatedValue ? (
                                <div className="space-y-0.5">
                                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Est. Value</span>
                                  <div className="flex items-center text-base sm:text-lg font-bold text-green-600">
                                    <IndianRupee className="h-4 w-4 mr-0.5" />
                                    {Number(lead.estimatedValue).toLocaleString("en-IN")}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground italic">No value set</div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-2 shrink-0 lg:ml-auto">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-xs px-3"
                                onClick={() => openEditModal(lead)}
                              >
                                View Details & Notes
                              </Button>
                              {isOwner && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 hover:bg-muted/80"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="macos-panel">
                                    <DropdownMenuItem
                                      className="cursor-pointer"
                                      onClick={() => openEditModal(lead)}
                                    >
                                      <Pencil className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="cursor-pointer text-green-600 focus:text-green-700"
                                      onClick={() => openConvertModal(lead)}
                                    >
                                      <ArrowRightLeft className="h-4 w-4 mr-2" />
                                      Convert to Client
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive cursor-pointer"
                                      onClick={() => setLeadToDelete(lead)}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>

                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-6 snap-x snap-mandatory no-scrollbar items-start h-[calc(100vh-190px)] sm:h-[calc(100vh-220px)] min-h-[420px] sm:min-h-[500px]">
            {LEAD_STAGES.map((stage) => {
              const stageLeads = leadsByStage[stage];
              return (
                <div
                  key={stage}
                  className={`min-w-[260px] w-[80vw] sm:w-[280px] flex flex-col snap-center shrink-0 rounded-xl border border-white/10 border-t-4 ${STAGE_HEADER_COLORS[stage]} bg-white/5 h-full`}
                >
                  {/* Column Header */}
                  <div className="px-4 py-3 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{stage}</span>
                      <Badge variant="outline" className="text-xs h-5 px-1.5">
                        {stageLeads.length}
                      </Badge>
                    </div>
                  </div>

                  <Droppable droppableId={stage}>
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={cn(
                          "rounded-xl p-2 min-h-[120px] transition-colors flex-1 overflow-y-auto no-scrollbar flex flex-col gap-3",
                          snapshot.isDraggingOver
                            ? "bg-primary/10 ring-2 ring-primary/20"
                            : "bg-white/20 dark:bg-black/20"
                        )}
                      >
                        {stageLeads.map((lead: Lead, index: number) => (
                          <Draggable key={lead.id} draggableId={lead.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                style={provided.draggableProps.style}
                                className={cn(
                                  "mb-3 group outline-none",
                                  snapshot.isDragging && "z-50 opacity-95"
                                )}
                                onMouseDown={(e) => {
                                  (provided.dragHandleProps as any)?.onMouseDown?.(e);
                                  handleStart(e.clientX, e.clientY);
                                }}
                                onMouseUp={(e) => {
                                  (provided.dragHandleProps as any)?.onMouseUp?.(e);
                                  handleEnd(e.clientX, e.clientY, lead);
                                }}
                                onTouchStart={(e) => {
                                  (provided.dragHandleProps as any)?.onTouchStart?.(e);
                                  const touch = e.touches[0];
                                  if (touch) handleStart(touch.clientX, touch.clientY);
                                }}
                                onTouchEnd={(e) => {
                                  (provided.dragHandleProps as any)?.onTouchEnd?.(e);
                                  const touch = e.changedTouches[0];
                                  if (touch) handleEnd(touch.clientX, touch.clientY, lead);
                                }}
                              >
                                <div
                                  className={cn(
                                    "macos-card p-3 space-y-2 relative group/card cursor-grab group-active:cursor-grabbing hover:border-primary/30 transition-colors",
                                    snapshot.isDragging && "shadow-xl ring-2 ring-primary/30 bg-white"
                                  )}
                                >
                                  {/* Won celebration badge */}
                                  {lead.stage === "Won" && (
                                    <div className="flex items-center gap-1 text-green-600 text-xs font-semibold mb-1">
                                      <Trophy className="h-3 w-3" />
                                      Won!
                                    </div>
                                  )}

                                  {/* Card header: company + menu */}
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="font-semibold text-sm leading-tight">{lead.name}</p>
                                    {isOwner && (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 flex-shrink-0"
                                            onClick={(e) => e.stopPropagation()}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onMouseUp={(e) => e.stopPropagation()}
                                            onTouchStart={(e) => e.stopPropagation()}
                                            onTouchEnd={(e) => e.stopPropagation()}
                                          >
                                            <MoreHorizontal className="h-3.5 w-3.5" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                          align="end"
                                          className="macos-panel"
                                          onClick={(e) => e.stopPropagation()}
                                          onMouseDown={(e) => e.stopPropagation()}
                                          onMouseUp={(e) => e.stopPropagation()}
                                          onTouchStart={(e) => e.stopPropagation()}
                                          onTouchEnd={(e) => e.stopPropagation()}
                                        >
                                          <DropdownMenuItem
                                            className="cursor-pointer"
                                            onClick={(e) => { e.stopPropagation(); openEditModal(lead); }}
                                          >
                                            <Pencil className="h-4 w-4 mr-2" />
                                            Edit
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            className="cursor-pointer text-green-600 focus:text-green-700"
                                            onClick={(e) => { e.stopPropagation(); openConvertModal(lead); }}
                                          >
                                            <ArrowRightLeft className="h-4 w-4 mr-2" />
                                            Convert to Client
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem
                                            className="text-destructive focus:text-destructive cursor-pointer"
                                            onClick={(e) => { e.stopPropagation(); setLeadToDelete(lead); }}
                                          >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    )}
                                  </div>

                                  {/* Contact info */}
                                  {lead.contactName && (
                                    <p className="text-xs text-muted-foreground">{lead.contactName}</p>
                                  )}
                                  {lead.contactEmail && (
                                    <p className="text-xs text-muted-foreground truncate">{lead.contactEmail}</p>
                                  )}

                                  {/* Last Contacted Badge */}
                                  {lead.updatedAt && (
                                    <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground bg-black/5 w-fit px-1.5 py-0.5 rounded-sm">
                                      <MessageSquare className="h-3 w-3" />
                                      Last Contacted: {new Date(lead.updatedAt).toLocaleDateString()}
                                    </div>
                                  )}

                                  {/* Bottom row: industry badge + value */}
                                  <div className="flex items-center justify-between gap-2 pt-1">
                                    {lead.industry && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs px-1.5 py-0 h-4 border-0 bg-primary/5 text-primary"
                                      >
                                        {lead.industry}
                                      </Badge>
                                    )}
                                    {lead.estimatedValue && (
                                      <div className="flex items-center gap-0.5 text-xs font-semibold text-green-600 ml-auto">
                                        <IndianRupee className="h-3 w-3" />
                                        {Number(lead.estimatedValue).toLocaleString("en-IN")}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {/* Add / Edit Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="macos-panel sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingLead ? "Edit Lead" : "Add Lead"}</DialogTitle>
            <DialogDescription>
              {editingLead ? "Update lead details and track notes." : "Add a new lead to your pipeline."}
            </DialogDescription>
          </DialogHeader>

          {editingLead ? (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4 bg-white/40">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="notes">Notes & Comments</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
                <div className="space-y-2">
                  <Label htmlFor="lead-name">Company Name *</Label>
                  <Input
                    id="lead-name"
                    placeholder="Acme Corp"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead-contact-name">Contact Name</Label>
                  <Input
                    id="lead-contact-name"
                    placeholder="Jane Doe"
                    value={form.contactName}
                    onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead-contact-email">Contact Email</Label>
                  <Input
                    id="lead-contact-email"
                    type="email"
                    placeholder="jane@acme.com"
                    value={form.contactEmail}
                    onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead-contact-phone">Contact Phone</Label>
                  <Input
                    id="lead-contact-phone"
                    placeholder="+91 98765 43210"
                    value={form.contactPhone}
                    onChange={(e) => setForm((p) => ({ ...p, contactPhone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead-industry">Industry</Label>
                  <select
                    id="lead-industry"
                    className="macos-input w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    value={form.industry}
                    onChange={(e) => setForm((p) => ({ ...p, industry: e.target.value }))}
                  >
                    <option value="">Select industry</option>
                    {INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead-stage">Stage</Label>
                  <select
                    id="lead-stage"
                    className="macos-input w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    value={form.stage}
                    onChange={(e) => setForm((p) => ({ ...p, stage: e.target.value as LeadStage }))}
                  >
                    {LEAD_STAGES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead-value">Estimated Value (₹)</Label>
                  <Input
                    id="lead-value"
                    type="number"
                    placeholder="500000"
                    value={form.estimatedValue}
                    onChange={(e) => setForm((p) => ({ ...p, estimatedValue: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead-notes">Notes</Label>
                  <Textarea
                    id="lead-notes"
                    placeholder="Any additional notes..."
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                    rows={3}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="notes">
                <LeadCommentsTab leadId={editingLead.id} />
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
              <div className="space-y-2">
                <Label htmlFor="lead-name">Company Name *</Label>
                <Input
                  id="lead-name"
                  placeholder="Acme Corp"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead-contact-name">Contact Name</Label>
                <Input
                  id="lead-contact-name"
                  placeholder="Jane Doe"
                  value={form.contactName}
                  onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead-contact-email">Contact Email</Label>
                <Input
                  id="lead-contact-email"
                  type="email"
                  placeholder="jane@acme.com"
                  value={form.contactEmail}
                  onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead-contact-phone">Contact Phone</Label>
                <Input
                  id="lead-contact-phone"
                  placeholder="+91 98765 43210"
                  value={form.contactPhone}
                  onChange={(e) => setForm((p) => ({ ...p, contactPhone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead-industry">Industry</Label>
                <select
                  id="lead-industry"
                  className="macos-input w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={form.industry}
                  onChange={(e) => setForm((p) => ({ ...p, industry: e.target.value }))}
                >
                  <option value="">Select industry</option>
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead-stage">Stage</Label>
                <select
                  id="lead-stage"
                  className="macos-input w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={form.stage}
                  onChange={(e) => setForm((p) => ({ ...p, stage: e.target.value as LeadStage }))}
                >
                  {LEAD_STAGES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead-value">Estimated Value (₹)</Label>
                <Input
                  id="lead-value"
                  type="number"
                  placeholder="500000"
                  value={form.estimatedValue}
                  onChange={(e) => setForm((p) => ({ ...p, estimatedValue: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead-notes">Notes</Label>
                <Textarea
                  id="lead-notes"
                  placeholder="Any additional notes..."
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isCreating || isUpdating}>
              {(isCreating || isUpdating) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingLead ? "Update" : "Add"} Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!leadToDelete} onOpenChange={(open) => !open && setLeadToDelete(null)}>
        <AlertDialogContent className="macos-panel">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{leadToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Convert to Client Modal */}
      <Dialog open={!!convertingLead} onOpenChange={(open) => !open && setConvertingLead(null)}>
        <DialogContent className="macos-panel sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-green-600" />
              Convert Lead to Client
            </DialogTitle>
            <DialogDescription>
              Review and confirm the client details. The lead will be converted and removed from the lead panel.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="convert-name">Company Name *</Label>
                <Input
                  id="convert-name"
                  value={convertForm.name}
                  onChange={(e) => setConvertForm(p => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="convert-industry">Industry *</Label>
                <select
                  id="convert-industry"
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={convertForm.industry}
                  onChange={(e) => setConvertForm(p => ({ ...p, industry: e.target.value }))}
                >
                  <option value="">Select industry</option>
                  {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="convert-stage">Client Stage</Label>
                <select
                  id="convert-stage"
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={convertForm.stage}
                  onChange={(e) => setConvertForm(p => ({ ...p, stage: e.target.value }))}
                >
                  <option value="Hot">Hot</option>
                  <option value="Warm">Warm</option>
                  <option value="Cold">Cold</option>
                  <option value="Hold">Hold</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="convert-contact-name">Contact Name</Label>
                <Input
                  id="convert-contact-name"
                  value={convertForm.contactName}
                  onChange={(e) => setConvertForm(p => ({ ...p, contactName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="convert-contact-email">Contact Email</Label>
                <Input
                  id="convert-contact-email"
                  type="email"
                  value={convertForm.contactEmail}
                  onChange={(e) => setConvertForm(p => ({ ...p, contactEmail: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="convert-contact-phone">Contact Phone</Label>
                <Input
                  id="convert-contact-phone"
                  value={convertForm.contactPhone}
                  onChange={(e) => setConvertForm(p => ({ ...p, contactPhone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="convert-revenue">Expected Revenue (₹)</Label>
                <Input
                  id="convert-revenue"
                  type="number"
                  value={convertForm.expectedRevenue}
                  onChange={(e) => setConvertForm(p => ({ ...p, expectedRevenue: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="convert-notes">Notes</Label>
                <Textarea
                  id="convert-notes"
                  value={convertForm.notes}
                  onChange={(e) => setConvertForm(p => ({ ...p, notes: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertingLead(null)}>Cancel</Button>
            <Button
              onClick={handleConvert}
              disabled={isConverting}
              className="bg-green-600 hover:bg-green-700 text-white gap-2"
            >
              {isConverting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
              Convert to Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
