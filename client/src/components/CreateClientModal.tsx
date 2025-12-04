import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useCreateClient } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { Loader2, FileUp, DollarSign, X } from "lucide-react";
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

const STAGES = ["Hot", "Warm", "Cold"];

interface CreateClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateClientModal({ open, onOpenChange }: CreateClientModalProps) {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [stage, setStage] = useState("Warm");
  const [revenue, setRevenue] = useState("");
  const [proposalFile, setProposalFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  
  const { mutate: createClient, isPending } = useCreateClient();
  const { user } = useAuth();
  const { toast } = useToast();

  const resetForm = () => {
    setName("");
    setIndustry("");
    setStage("Warm");
    setRevenue("");
    setProposalFile(null);
    setNotes("");
  };

  const handleSubmit = async () => {
    if (!name.trim() || !industry || !user?.id) {
      return;
    }

    const revenueValue = parseFloat(revenue.replace(/[^0-9.]/g, '')) || 0;
    
    let proposalFileData: string | null = null;
    let proposalFileName: string | null = null;
    
    if (proposalFile) {
      proposalFileName = proposalFile.name;
      proposalFileData = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(proposalFile);
      });
    }

    createClient({
      name: name.trim(),
      industry,
      stage,
      ownerId: user.id,
      averageProgress: "0",
      revenueTotal: revenueValue.toString(),
      notes: notes.trim() || null,
      proposalFileName,
      proposalFileData,
    }, {
      onSuccess: () => {
        if (proposalFile) {
          toast({
            title: "Client created with proposal",
            description: `${proposalFile.name} has been attached to ${name.trim()}.`
          });
        }
        resetForm();
        onOpenChange(false);
      }
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProposalFile(file);
      toast({
        title: "File selected",
        description: `${file.name} ready to upload`
      });
    }
  };

  const isValid = name.trim() && industry;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="macos-panel border-none sm:max-w-[550px] p-0 overflow-hidden max-h-[90vh]">
        <div className="p-6 border-b border-black/5 bg-white/50">
          <DialogHeader>
            <DialogTitle className="text-xl">Add New Client</DialogTitle>
            <DialogDescription>Create a new client to start tracking projects and revenue.</DialogDescription>
          </DialogHeader>
        </div>
        
        <div className="p-6 space-y-5 bg-white/30 overflow-y-auto max-h-[60vh]">
          <div className="space-y-2">
            <Label htmlFor="client-name">Client Name *</Label>
            <Input 
              id="client-name"
              data-testid="input-client-name"
              placeholder="e.g., Acme Corporation"
              className="macos-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Industry *</Label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger className="macos-input" data-testid="select-industry">
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
                <SelectTrigger className="macos-input" data-testid="select-stage">
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
            <Label htmlFor="revenue" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              Expected Revenue
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input 
                id="revenue"
                data-testid="input-revenue"
                placeholder="0.00"
                className="macos-input pl-7"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
                type="text"
                inputMode="decimal"
              />
            </div>
            <p className="text-xs text-muted-foreground">Enter the total expected revenue from this client</p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileUp className="h-4 w-4 text-primary" />
              Proposal Document
            </Label>
            {proposalFile ? (
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2">
                  <FileUp className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium truncate max-w-[250px]">{proposalFile.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(proposalFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setProposalFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Input 
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="macos-input cursor-pointer file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                  data-testid="input-proposal-file"
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground">Upload a proposal, contract, or project scope document (PDF, Word, Excel)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea 
              id="notes"
              data-testid="input-notes"
              placeholder="Add any notes about this client or project..."
              className="macos-input min-h-[80px] resize-none"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="p-6 border-t border-black/5 bg-white/50">
          <Button 
            variant="ghost" 
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
            data-testid="button-cancel-client"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!isValid || isPending}
            className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
            data-testid="button-create-client"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Client"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
