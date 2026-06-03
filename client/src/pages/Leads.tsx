import { useState } from "react";
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
import { Plus, MoreHorizontal, Trash2, Pencil, Loader2, Trophy, IndianRupee, ArrowRightLeft, Send, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
                  <div className="text-sm bg-white/60 p-3 rounded-md border border-white/40 shadow-sm whitespace-pre-wrap">
                    {comment.body}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
      <div className="flex gap-2 items-end border-t border-black/5 pt-4">
        <Textarea
          placeholder="Add a note or update..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="min-h-[60px] resize-none bg-white/60"
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

  const leadsByStage = LEAD_STAGES.reduce((acc, stage) => {
    acc[stage] = leads.filter((l: Lead) => l.stage === stage);
    return acc;
  }, {} as Record<LeadStage, Lead[]>);

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
        // Move lead to Won
        updateLead({ id: convertingLead.id, data: { stage: 'Won' } });
        setConvertingLead(null);
        toast({ title: '🎉 Lead converted!', description: `${convertForm.name} is now a client.` });
      }
    });
  };

  const handleDelete = () => {
    if (!leadToDelete) return;
    deleteLead(leadToDelete.id, { onSuccess: () => setLeadToDelete(null) });
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Lead Pipeline</h1>
          <p className="text-muted-foreground mt-1">
            Track your leads from first contact to close. {leads.length} total leads.
          </p>
        </div>
        {isOwner && (
          <Button className="gap-2 shadow-lg shadow-primary/20" onClick={openAddModal}>
            <Plus className="h-4 w-4" />
            Add Lead
          </Button>
        )}
      </div>

      {/* Kanban Columns */}
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-14rem)]">
        {LEAD_STAGES.map((stage) => {
          const stageLeads = leadsByStage[stage];
          return (
            <div
              key={stage}
              className={`flex-shrink-0 w-72 flex flex-col rounded-xl border border-white/10 border-t-4 ${STAGE_HEADER_COLORS[stage]} bg-white/5 backdrop-blur-sm`}
            >
              {/* Column Header */}
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{stage}</span>
                  <Badge variant="outline" className="text-xs h-5 px-1.5">
                    {stageLeads.length}
                  </Badge>
                </div>
              </div>

              {/* Cards */}
              <div className="flex-1 px-3 pb-3 space-y-3 overflow-y-auto">
                {stageLeads.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-xs">
                    No leads in this stage
                  </div>
                )}
                {stageLeads.map((lead: Lead) => (
                  <div key={lead.id} className="macos-card p-3 space-y-2 relative group/card">
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
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
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
                ))}
              </div>
            </div>
          );
        })}
      </div>

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
              Review and confirm the client details. The lead will be moved to "Won".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-2">
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
              <div className="col-span-2 space-y-2">
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
