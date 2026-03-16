import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect } from "react";
import { useUpdateClient } from "@/lib/queries";
import { Loader2, IndianRupee, User, Mail, Phone, FileUp, X, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const INDUSTRIES = [
  "Technology",
  "Finance",
  "Healthcare",
  "Retail",
  "Manufacturing",
  "Media",
  "Consulting",
  "Real Estate",
  "Education",
  "SaaS",
  "Logistics",
  "Other"
];

const STAGES = ["Hot", "Warm", "Cold", "Dropped"];

interface ClientEditData {
  id: string;
  name: string;
  industry: string;
  stage: string;
  expectedRevenue: string | number;
  notes?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  proposalFileName?: string | null;
  proposalFileData?: string | null;
}

interface EditClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientEditData | null;
}

export function EditClientModal({ open, onOpenChange, client }: EditClientModalProps) {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [stage, setStage] = useState("Warm");
  const [revenue, setRevenue] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [proposalFile, setProposalFile] = useState<File | null>(null);
  const [existingProposalName, setExistingProposalName] = useState<string | null>(null);
  const [removeProposal, setRemoveProposal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const { mutate: updateClient, isPending } = useUpdateClient();
  const { toast } = useToast();

  // Pre-fill form when client changes
  useEffect(() => {
    if (client) {
      setName(client.name || "");
      setIndustry(client.industry || "");
      setStage(client.stage || "Warm");
      setRevenue(client.expectedRevenue ? String(client.expectedRevenue) : "");
      setContactName(client.contactName || "");
      setContactEmail(client.contactEmail || "");
      setContactPhone(client.contactPhone || "");
      setNotes(client.notes || "");
      setExistingProposalName(client.proposalFileName || null);
      setProposalFile(null);
      setRemoveProposal(false);
    }
  }, [client]);

  const handleSubmit = async () => {
    if (!name.trim() || !industry || !client?.id) return;

    setIsUploading(true);
    let proposalUrl: string | null | undefined = undefined;
    let proposalFileName: string | null | undefined = undefined;

    try {
      if (proposalFile) {
        const formData = new FormData();
        formData.append('file', proposalFile);
        formData.append('bucket', 'proposals');

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload proposal');
        }

        const { publicUrl, fileName } = await uploadResponse.json();
        proposalUrl = publicUrl;
        proposalFileName = fileName;
      } else if (removeProposal) {
        proposalUrl = null;
        proposalFileName = null;
      }

      const revenueValue = parseFloat(revenue.replace(/[^0-9.]/g, '')) || 0;

      const updateData: any = {
        name: name.trim(),
        industry,
        stage,
        expectedRevenue: revenueValue.toString(),
        notes: notes.trim() || null,
        contactName: contactName.trim() || null,
        contactEmail: contactEmail.trim() || null,
        contactPhone: contactPhone.trim() || null,
      };

      if (proposalUrl !== undefined) updateData.proposalFileData = proposalUrl;
      if (proposalFileName !== undefined) updateData.proposalFileName = proposalFileName;

      updateClient({ id: client.id, data: updateData }, {
        onSuccess: () => {
          onOpenChange(false);
        }
      });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload proposal",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const isValid = name.trim() && industry;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="macos-panel border-none sm:max-w-[650px] p-0 overflow-hidden max-h-[90vh]">
        <div className="p-6 border-b border-black/5 bg-white/50">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Client</DialogTitle>
            <DialogDescription>Update client details and contact information.</DialogDescription>
          </DialogHeader>
        </div>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-6 space-y-5 bg-white/30">
            <div className="space-y-2">
              <Label htmlFor="edit-client-name">Company Name *</Label>
              <Input
                id="edit-client-name"
                placeholder="e.g., Acme Corporation"
                className="macos-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-4">
              <Label className="flex items-center gap-2 text-blue-700 font-medium">
                <User className="h-4 w-4" />
                Client Contact Details
              </Label>

              <div className="space-y-2">
                <Label htmlFor="edit-contact-name">Contact Name</Label>
                <Input
                  id="edit-contact-name"
                  placeholder="e.g., John Smith"
                  className="macos-input"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-contact-email" className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Email
                  </Label>
                  <Input
                    id="edit-contact-email"
                    type="email"
                    placeholder="john@acme.com"
                    className="macos-input"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-contact-phone" className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Phone
                  </Label>
                  <Input
                    id="edit-contact-phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    className="macos-input"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Industry *</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger className="macos-input">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map(ind => (
                      <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Stage</Label>
                <Select value={stage} onValueChange={setStage}>
                  <SelectTrigger className="macos-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-revenue" className="flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-green-600" />
                Expected Revenue
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                <Input
                  id="edit-revenue"
                  placeholder="0.00"
                  className="macos-input pl-7"
                  value={revenue}
                  onChange={(e) => setRevenue(e.target.value)}
                  type="text"
                  inputMode="decimal"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Additional Notes</Label>
              <Textarea
                id="edit-notes"
                placeholder="Add any notes about this client or project..."
                className="macos-input min-h-[60px] resize-none"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/50 space-y-3">
              <Label className="flex items-center gap-2 text-purple-700 font-medium">
                <FileUp className="h-4 w-4" />
                Proposal Document
              </Label>

              {proposalFile ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/60 border border-purple-100">
                  <FileText className="h-5 w-5 text-purple-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{proposalFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(proposalFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => setProposalFile(null)}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : existingProposalName && !removeProposal ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/60 border border-purple-100">
                  <FileText className="h-5 w-5 text-purple-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{existingProposalName}</p>
                    <p className="text-xs text-muted-foreground">Current proposal</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => setRemoveProposal(true)}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    id="edit-proposal-file"
                    type="file"
                    className="macos-input cursor-pointer"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 5 * 1024 * 1024) {
                          toast({
                            title: "File too large",
                            description: "Maximum file size is 5MB",
                            variant: "destructive"
                          });
                          return;
                        }
                        setProposalFile(file);
                        setRemoveProposal(false);
                      }
                    }}
                  />
                </div>
              )}
              <p className="text-xs text-purple-600">
                Upload a proposal, quote, or contract document (PDF, DOC, XLS, PPT - max 5MB)
              </p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 border-t border-black/5 bg-white/50">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isPending || isUploading}
            className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
          >
            {(isPending || isUploading) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isUploading ? "Uploading..." : "Saving..."}
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
