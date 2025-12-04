import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useCreateClient } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";

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
  
  const { mutate: createClient, isPending } = useCreateClient();
  const { user } = useAuth();

  const handleSubmit = () => {
    if (!name.trim() || !industry || !user?.id) {
      return;
    }

    createClient({
      name: name.trim(),
      industry,
      stage,
      ownerId: user.id,
      averageProgress: "0",
      revenueTotal: "0",
    }, {
      onSuccess: () => {
        setName("");
        setIndustry("");
        setStage("Warm");
        onOpenChange(false);
      }
    });
  };

  const isValid = name.trim() && industry;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="macos-panel border-none sm:max-w-[500px] p-0 overflow-hidden">
        <div className="p-6 border-b border-black/5 bg-white/50">
          <DialogHeader>
            <DialogTitle className="text-xl">Add New Client</DialogTitle>
            <DialogDescription>Create a new client to start tracking projects and stories.</DialogDescription>
          </DialogHeader>
        </div>
        
        <div className="p-6 space-y-6 bg-white/30">
          <div className="space-y-2">
            <Label htmlFor="client-name">Client Name</Label>
            <Input 
              id="client-name"
              data-testid="input-client-name"
              placeholder="e.g., Acme Corporation"
              className="macos-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Industry</Label>
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

        <DialogFooter className="p-6 border-t border-black/5 bg-white/50">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
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
