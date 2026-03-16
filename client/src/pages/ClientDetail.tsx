import { useRoute } from "wouter";
import { KanbanBoard } from "@/components/KanbanBoard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowLeft, TrendingUp, IndianRupee, Loader2, FileText, Trash2, Pencil, Upload, X, Receipt, Phone, Video, Mail, MessageSquare, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { StoryModal } from "@/components/StoryModal";
import { CreateStoryModal } from "@/components/CreateStoryModal";
import { useClient, useStories, useUpdateStory, useInvoices, useCreateInvoice, useUpdateInvoice, useDeleteInvoice, useCommunications, useCreateCommunication, useDeleteCommunication } from "@/lib/queries";
import { useIsOwner } from "@/lib/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format, differenceInDays, isPast } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

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

type Invoice = {
  id: string;
  clientId: string;
  label: string;
  amount: string;
  issuedOn: string;
  status: string;
  fileName?: string | null;
  fileType?: string | null;
  fileData?: string | null;
  notes?: string | null;
};

export default function ClientDetail() {
  const [, params] = useRoute("/clients/:id");
  const { toast } = useToast();
  const isOwner = useIsOwner();

  const { data: client, isLoading: isLoadingClient } = useClient(params?.id || '');
  const { data: allStories = [], isLoading: isLoadingStories } = useStories(params?.id);
  const { data: invoices = [], isLoading: isLoadingInvoices } = useInvoices(params?.id || '');
  const { data: communications = [], isLoading: isLoadingComms } = useCommunications(params?.id || '');
  const { mutate: updateStory } = useUpdateStory();
  const { mutate: createInvoice, isPending: isCreatingInvoice } = useCreateInvoice();
  const { mutate: updateInvoice, isPending: isUpdatingInvoice } = useUpdateInvoice();
  const { mutate: deleteInvoice } = useDeleteInvoice();
  const { mutate: createCommunication, isPending: isCreatingComm } = useCreateCommunication();
  const { mutate: deleteCommunication } = useDeleteCommunication();

  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    label: '',
    amount: '',
    issuedOn: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
    fileName: '',
    fileData: '',
    fileType: '',
  });

  // Communications state
  const [isCommModalOpen, setIsCommModalOpen] = useState(false);
  const [commForm, setCommForm] = useState({
    type: 'call',
    date: format(new Date(), 'yyyy-MM-dd'),
    summary: '',
  });

  const getContractEndDateBadge = () => {
    if (!client?.contractEndDate) return null;
    const endDate = new Date(client.contractEndDate);
    const today = new Date();
    const daysUntil = differenceInDays(endDate, today);
    const past = isPast(endDate);

    if (past) {
      return (
        <Badge className="bg-red-500/10 text-red-600 border border-red-200 gap-1 font-normal">
          <AlertTriangle className="h-3 w-3" />
          Contract ended: {format(endDate, 'MMM dd, yyyy')}
        </Badge>
      );
    }
    if (daysUntil <= 30) {
      return (
        <Badge className="bg-orange-500/10 text-orange-600 border border-orange-200 gap-1 font-normal">
          <AlertTriangle className="h-3 w-3" />
          Contract ends: {format(endDate, 'MMM dd, yyyy')}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 font-normal">
        Contract ends: {format(endDate, 'MMM dd, yyyy')}
      </Badge>
    );
  };

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

  const expectedRevenue = Number(client.expectedRevenue || 0);
  const receivedRevenue = Number(client.revenueTotal || 0);
  const revenueProgress = expectedRevenue > 0 ? (receivedRevenue / expectedRevenue) * 100 : 0;

  const openAddInvoiceModal = () => {
    setEditingInvoice(null);
    setInvoiceFile(null);
    setInvoiceForm({
      label: '',
      amount: '',
      issuedOn: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
      fileName: '',
      fileData: '',
      fileType: '',
    });
    setIsInvoiceModalOpen(true);
  };

  const openEditInvoiceModal = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setInvoiceFile(null);
    setInvoiceForm({
      label: invoice.label,
      amount: invoice.amount,
      issuedOn: format(new Date(invoice.issuedOn), 'yyyy-MM-dd'),
      notes: invoice.notes || '',
      fileName: invoice.fileName || '',
      fileData: invoice.fileData || '',
      fileType: invoice.fileType || '',
    });
    setIsInvoiceModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 5MB", variant: "destructive" });
      return;
    }

    setInvoiceFile(file);
    setInvoiceForm(prev => ({
      ...prev,
      fileName: file.name,
      fileType: file.type,
    }));
  };

  const handleSubmitInvoice = async () => {
    if (!invoiceForm.label.trim() || !invoiceForm.amount) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    let finalFileData = invoiceForm.fileData;

    try {
      // Upload via backend API if there is a new file
      if (invoiceFile) {
        const formData = new FormData();
        formData.append('file', invoiceFile);
        formData.append('bucket', 'invoices');

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!uploadResponse.ok) {
          throw new Error('Upload failed');
        }

        const { publicUrl } = await uploadResponse.json();
        finalFileData = publicUrl;
      }

      const invoiceData = {
        label: invoiceForm.label,
        amount: invoiceForm.amount,
        issuedOn: invoiceForm.issuedOn,
        notes: invoiceForm.notes || null,
        fileName: invoiceForm.fileName || null,
        fileType: invoiceForm.fileType || null,
        fileData: finalFileData || null,
      };

      if (editingInvoice) {
        updateInvoice({ id: editingInvoice.id, data: invoiceData }, {
          onSuccess: () => setIsInvoiceModalOpen(false),
        });
      } else {
        createInvoice({ clientId: params?.id || '', data: invoiceData }, {
          onSuccess: () => setIsInvoiceModalOpen(false),
        });
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload file",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    deleteInvoice(invoiceId);
  };

  const downloadInvoiceFile = (invoice: Invoice) => {
    if (!invoice.fileData) return;
    const link = document.createElement('a');
    link.href = invoice.fileData;
    link.download = invoice.fileName || 'invoice';
    link.click();
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4 animate-in fade-in duration-500">
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
                  client.stage === 'Dropped' ? "bg-gray-500 hover:bg-gray-600" :
                    "bg-blue-500 hover:bg-blue-600"
            }>
              {client.stage}
            </Badge>
            {getContractEndDateBadge()}
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
          {isOwner && (
            <>
              <div className="flex items-center gap-2 text-muted-foreground">
                <IndianRupee className="h-4 w-4 text-green-500" />
                <span className="font-medium text-foreground">₹{expectedRevenue.toLocaleString('en-IN')}</span> Expected
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <IndianRupee className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground">₹{receivedRevenue.toLocaleString('en-IN')}</span> Received
              </div>
            </>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">{Number(client.averageProgress).toFixed(0)}%</span> Avg Progress
          </div>
        </div>
      </div>

      <Tabs defaultValue="kanban" className="flex-1 min-h-0 flex flex-col">
        <TabsList className="w-fit">
          <TabsTrigger value="kanban" data-testid="tab-kanban">Kanban Board</TabsTrigger>
          {isOwner && (
            <TabsTrigger value="invoices" data-testid="tab-invoices">
              Invoices ({invoices.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="communications" data-testid="tab-communications">
            Communications ({communications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="flex-1 min-h-0 mt-4">
          <KanbanBoard
            stories={allStories}
            onStoryMove={handleStoryMove}
            onStoryClick={handleStoryClick}
          />
        </TabsContent>

        <TabsContent value="communications" className="flex-1 min-h-0 mt-4 overflow-auto">
          {(() => {
            const COMM_TYPES = [
              { value: 'call', label: 'Phone Call', icon: Phone },
              { value: 'meeting', label: 'Meeting', icon: Video },
              { value: 'email', label: 'Email', icon: Mail },
              { value: 'note', label: 'Note', icon: FileText },
              { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
            ];

            const getCommIcon = (type: string) => {
              const found = COMM_TYPES.find(t => t.value === type);
              const Icon = found?.icon || FileText;
              return <Icon className="h-4 w-4" />;
            };

            const getCommLabel = (type: string) => {
              return COMM_TYPES.find(t => t.value === type)?.label || type;
            };

            const sortedComms = [...communications].sort((a: any, b: any) =>
              new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
            );

            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Communication Logs</h3>
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      setCommForm({ type: 'call', date: format(new Date(), 'yyyy-MM-dd'), summary: '' });
                      setIsCommModalOpen(true);
                    }}
                    data-testid="button-log-communication"
                  >
                    <Plus className="h-4 w-4" />
                    Log Communication
                  </Button>
                </div>

                {isLoadingComms ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : sortedComms.length === 0 ? (
                  <div className="macos-card p-8 text-center">
                    <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No communication logs yet</p>
                    <p className="text-sm text-muted-foreground">Log calls, meetings, emails and more.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sortedComms.map((comm: any) => (
                      <div key={comm.id} className="macos-card p-4 flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0 mt-0.5">
                            {getCommIcon(comm.type)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{getCommLabel(comm.type)}</span>
                              <span className="text-xs text-muted-foreground">
                                {comm.date ? format(new Date(comm.date), 'MMM d, yyyy') : ''}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{comm.summary}</p>
                            {comm.loggedBy && (
                              <p className="text-xs text-muted-foreground mt-1">Logged by {comm.loggedBy}</p>
                            )}
                          </div>
                        </div>
                        {isOwner && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive flex-shrink-0">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="macos-panel">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Log</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this communication log? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => deleteCommunication(comm.id)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </TabsContent>

        <TabsContent value="invoices" className="flex-1 min-h-0 mt-4 overflow-auto">
          <div className="space-y-4">
            <div className="macos-card p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">Revenue Tracking</h3>
                  <p className="text-sm text-muted-foreground">
                    ₹{receivedRevenue.toLocaleString('en-IN')} received of ₹{expectedRevenue.toLocaleString('en-IN')} expected
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-primary">{revenueProgress.toFixed(0)}%</span>
                  <p className="text-xs text-muted-foreground">collected</p>
                </div>
              </div>
              <Progress value={revenueProgress} className="h-2" />
            </div>

            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Invoices</h3>
              <Button onClick={openAddInvoiceModal} size="sm" className="gap-2" data-testid="button-add-invoice">
                <Plus className="h-4 w-4" />
                Add Invoice
              </Button>
            </div>

            {isLoadingInvoices ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : invoices.length === 0 ? (
              <div className="macos-card p-8 text-center">
                <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No invoices yet</p>
                <p className="text-sm text-muted-foreground">Add invoices to track your revenue collection</p>
              </div>
            ) : (
              <div className="space-y-2">
                {invoices.map((invoice: Invoice) => (
                  <div key={invoice.id} className="macos-card p-4 flex items-center justify-between" data-testid={`invoice-${invoice.id}`}>
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{invoice.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(invoice.issuedOn), 'MMM d, yyyy')}
                          {invoice.notes && ` • ${invoice.notes}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {invoice.status !== 'paid' && new Date(invoice.issuedOn) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Overdue</span>
                      )}
                      <span className="font-semibold text-lg">₹{parseFloat(invoice.amount).toLocaleString('en-IN')}</span>
                      <div className="flex gap-1">
                        {invoice.fileData && (
                          <Button variant="ghost" size="sm" onClick={() => downloadInvoiceFile(invoice)} data-testid={`download-invoice-${invoice.id}`}>
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => openEditInvoiceModal(invoice)} data-testid={`edit-invoice-${invoice.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" data-testid={`delete-invoice-${invoice.id}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{invoice.label}"? This will also update the total received revenue for this client.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteInvoice(invoice.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isInvoiceModalOpen} onOpenChange={setIsInvoiceModalOpen}>
        <DialogContent className="macos-panel sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingInvoice ? 'Edit Invoice' : 'Add Invoice'}</DialogTitle>
            <DialogDescription>
              {editingInvoice ? 'Update invoice details' : 'Add a new invoice to track revenue'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invoice-label">Invoice Label *</Label>
              <Input
                id="invoice-label"
                placeholder="e.g., Invoice #1 - Phase 1"
                value={invoiceForm.label}
                onChange={(e) => setInvoiceForm(prev => ({ ...prev, label: e.target.value }))}
                data-testid="input-invoice-label"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-amount">Amount (₹) *</Label>
              <Input
                id="invoice-amount"
                type="number"
                placeholder="40000"
                value={invoiceForm.amount}
                onChange={(e) => setInvoiceForm(prev => ({ ...prev, amount: e.target.value }))}
                data-testid="input-invoice-amount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-date">Issue Date</Label>
              <Input
                id="invoice-date"
                type="date"
                value={invoiceForm.issuedOn}
                onChange={(e) => setInvoiceForm(prev => ({ ...prev, issuedOn: e.target.value }))}
                data-testid="input-invoice-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-notes">Notes</Label>
              <Textarea
                id="invoice-notes"
                placeholder="Optional notes about this invoice"
                value={invoiceForm.notes}
                onChange={(e) => setInvoiceForm(prev => ({ ...prev, notes: e.target.value }))}
                data-testid="input-invoice-notes"
              />
            </div>
            <div className="space-y-2">
              <Label>Attachment</Label>
              {invoiceForm.fileName ? (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm flex-1 truncate">{invoiceForm.fileName}</span>
                  <Button variant="ghost" size="sm" onClick={() => {
                    setInvoiceForm(prev => ({ ...prev, fileName: '', fileData: '', fileType: '' }));
                    setInvoiceFile(null);
                  }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <input
                    type="file"
                    id="invoice-file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                    onChange={handleFileUpload}
                  />
                  <label htmlFor="invoice-file" className="cursor-pointer">
                    <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Click to upload invoice file</p>
                    <p className="text-xs text-muted-foreground">PDF, DOC, or image (max 5MB)</p>
                  </label>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInvoiceModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitInvoice} disabled={isCreatingInvoice || isUpdatingInvoice || isUploading} data-testid="button-save-invoice">
              {(isCreatingInvoice || isUpdatingInvoice || isUploading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingInvoice ? 'Update' : 'Add'} Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Communication Modal */}
      <Dialog open={isCommModalOpen} onOpenChange={setIsCommModalOpen}>
        <DialogContent className="macos-panel sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log Communication</DialogTitle>
            <DialogDescription>Record a call, meeting, email or note with this client.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="comm-type">Type</Label>
              <select
                id="comm-type"
                className="macos-input w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={commForm.type}
                onChange={(e) => setCommForm(p => ({ ...p, type: e.target.value }))}
              >
                <option value="call">Phone Call</option>
                <option value="meeting">Meeting</option>
                <option value="email">Email</option>
                <option value="note">Note</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="comm-date">Date</Label>
              <Input
                id="comm-date"
                type="date"
                value={commForm.date}
                onChange={(e) => setCommForm(p => ({ ...p, date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comm-summary">Summary *</Label>
              <Textarea
                id="comm-summary"
                placeholder="What was discussed or noted?"
                value={commForm.summary}
                rows={4}
                onChange={(e) => setCommForm(p => ({ ...p, summary: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCommModalOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!commForm.summary.trim()) {
                  toast({ title: "Summary is required", variant: "destructive" });
                  return;
                }
                createCommunication(
                  { clientId: params?.id || '', data: { type: commForm.type, date: commForm.date, summary: commForm.summary.trim() } },
                  { onSuccess: () => setIsCommModalOpen(false) }
                );
              }}
              disabled={isCreatingComm}
            >
              {isCreatingComm && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Log
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StoryModal
        story={selectedStory}
        client={client}
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
