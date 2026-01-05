import { useRoute } from "wouter";
import { KanbanBoard } from "@/components/KanbanBoard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowLeft, TrendingUp, IndianRupee, Loader2, FileText, Trash2, Pencil, Upload, X, Receipt } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { StoryModal } from "@/components/StoryModal";
import { CreateStoryModal } from "@/components/CreateStoryModal";
import { useClient, useStories, useUpdateStory, useInvoices, useCreateInvoice, useUpdateInvoice, useDeleteInvoice } from "@/lib/queries";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
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
  const [match, params] = useRoute("/clients/:id");
  const { toast } = useToast();

  const { data: client, isLoading: isLoadingClient } = useClient(params?.id || '');
  const { data: allStories = [], isLoading: isLoadingStories } = useStories(params?.id);
  const { data: invoices = [], isLoading: isLoadingInvoices } = useInvoices(params?.id || '');
  const { mutate: updateStory } = useUpdateStory();
  const { mutate: createInvoice, isPending: isCreatingInvoice } = useCreateInvoice();
  const { mutate: updateInvoice, isPending: isUpdatingInvoice } = useUpdateInvoice();
  const { mutate: deleteInvoice } = useDeleteInvoice();

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
          <div className="flex items-center gap-2 text-muted-foreground">
            <IndianRupee className="h-4 w-4 text-green-500" />
            <span className="font-medium text-foreground">₹{expectedRevenue.toLocaleString('en-IN')}</span> Expected
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <IndianRupee className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">₹{receivedRevenue.toLocaleString('en-IN')}</span> Received
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">{Number(client.averageProgress).toFixed(0)}%</span> Avg Progress
          </div>
        </div>
      </div>

      <Tabs defaultValue="kanban" className="flex-1 min-h-0 flex flex-col">
        <TabsList className="w-fit">
          <TabsTrigger value="kanban" data-testid="tab-kanban">Kanban Board</TabsTrigger>
          <TabsTrigger value="invoices" data-testid="tab-invoices">
            Invoices ({invoices.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="flex-1 min-h-0 mt-4">
          <KanbanBoard
            stories={allStories}
            onStoryMove={handleStoryMove}
            onStoryClick={handleStoryClick}
          />
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
