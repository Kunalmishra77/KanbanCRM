import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { useCreateClient } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { Loader2, IndianRupee, User, Mail, Phone, Receipt, Info } from "lucide-react";
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

interface CreateClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateClientModal({ open, onOpenChange }: CreateClientModalProps) {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [stage, setStage] = useState("Warm");
  const [revenue, setRevenue] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [notes, setNotes] = useState("");
  
  const { mutate: createClient, isPending } = useCreateClient();
  const { user } = useAuth();
  const { toast } = useToast();

  const resetForm = () => {
    setName("");
    setIndustry("");
    setStage("Warm");
    setRevenue("");
    setContactName("");
    setContactEmail("");
    setContactPhone("");
    setNotes("");
  };

  const handleSubmit = async () => {
    if (!name.trim() || !industry || !user?.id) {
      return;
    }

    const revenueValue = parseFloat(revenue.replace(/[^0-9.]/g, '')) || 0;

    createClient({
      name: name.trim(),
      industry,
      stage,
      ownerId: user.id,
      averageProgress: "0",
      expectedRevenue: revenueValue.toString(),
      revenueTotal: "0",
      notes: notes.trim() || null,
      proposalFileName: null,
      proposalFileData: null,
      contactName: contactName.trim() || null,
      contactEmail: contactEmail.trim() || null,
      contactPhone: contactPhone.trim() || null,
    }, {
      onSuccess: () => {
        toast({
          title: "Client created",
          description: "New client has been added successfully."
        });
        resetForm();
        onOpenChange(false);
      }
    });
  };

  const isValid = name.trim() && industry;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="macos-panel border-none sm:max-w-[650px] p-0 overflow-hidden max-h-[90vh]">
        <div className="p-6 border-b border-black/5 bg-white/50">
          <DialogHeader>
            <DialogTitle className="text-xl">Add New Client</DialogTitle>
            <DialogDescription>Create a new client to manage their projects and invoices.</DialogDescription>
          </DialogHeader>
        </div>
        
        <ScrollArea className="max-h-[60vh]">
          <div className="p-6 space-y-5 bg-white/30">
            <div className="space-y-2">
              <Label htmlFor="client-name">Company Name *</Label>
              <Input 
                id="client-name"
                data-testid="input-client-name"
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
                <Label htmlFor="contact-name">Contact Name</Label>
                <Input 
                  id="contact-name"
                  data-testid="input-contact-name"
                  placeholder="e.g., John Smith"
                  className="macos-input"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact-email" className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Email
                  </Label>
                  <Input 
                    id="contact-email"
                    data-testid="input-contact-email"
                    type="email"
                    placeholder="john@acme.com"
                    className="macos-input"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-phone" className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Phone
                  </Label>
                  <Input 
                    id="contact-phone"
                    data-testid="input-contact-phone"
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
                <IndianRupee className="h-4 w-4 text-green-600" />
                Expected Revenue
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea 
                id="notes"
                data-testid="input-notes"
                placeholder="Add any notes about this client or project..."
                className="macos-input min-h-[60px] resize-none"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-amber-600" />
                <Label className="text-amber-700 font-medium">Invoices & Documents</Label>
              </div>
              <div className="flex items-start gap-2 text-sm text-amber-700">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>After creating this client, you can add invoices and documents by clicking on the client and going to the <strong>Invoices</strong> tab. Each invoice will track your revenue collection against the expected amount.</p>
              </div>
            </div>
          </div>
        </ScrollArea>

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
