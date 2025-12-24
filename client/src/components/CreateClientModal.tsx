import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { useCreateClient } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { Loader2, FileUp, IndianRupee, X, Sparkles, CheckCircle2, Clock, User, Mail, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { aiAPI } from "@/lib/api";

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

interface ExtractedTask {
  title: string;
  description: string;
  priority: "High" | "Medium" | "Low";
  estimatedHours: number;
  selected: boolean;
}

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
  const [proposalFile, setProposalFile] = useState<File | null>(null);
  const [proposalText, setProposalText] = useState("");
  const [notes, setNotes] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[]>([]);
  const [projectSummary, setProjectSummary] = useState("");
  const [showAnalysis, setShowAnalysis] = useState(false);
  
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
    setProposalFile(null);
    setProposalText("");
    setNotes("");
    setExtractedTasks([]);
    setProjectSummary("");
    setShowAnalysis(false);
  };

  const handleAnalyzeProposal = async () => {
    if (!proposalText.trim() && !proposalFile) {
      toast({ title: "No proposal content", description: "Please upload a file or paste proposal text", variant: "destructive" });
      return;
    }

    setIsAnalyzing(true);
    try {
      let textToAnalyze = proposalText.trim();
      
      if (proposalFile && !textToAnalyze) {
        textToAnalyze = await proposalFile.text();
      }

      const analysis = await aiAPI.analyzeProposal(textToAnalyze, name || "New Client");
      
      if (!analysis.suggestedTasks || analysis.suggestedTasks.length === 0) {
        if (analysis.projectSummary === "Unable to analyze proposal") {
          toast({ 
            title: "Analysis failed", 
            description: "Could not extract tasks from the proposal. Try adding more details or check the document format.", 
            variant: "destructive" 
          });
          return;
        }
      }
      
      if (analysis.extractedRevenue && !revenue) {
        setRevenue(analysis.extractedRevenue.toString());
      }
      
      setProjectSummary(analysis.projectSummary || "");
      setExtractedTasks(
        (analysis.suggestedTasks || []).map((task: any) => ({
          ...task,
          selected: true,
        }))
      );
      setShowAnalysis(true);
      
      const taskCount = analysis.suggestedTasks?.length || 0;
      toast({ 
        title: taskCount > 0 ? "Proposal analyzed" : "Analysis complete",
        description: taskCount > 0 
          ? `Found ${taskCount} tasks and extracted project details.`
          : "No specific tasks found, but you can still create the client."
      });
    } catch (error) {
      console.error("Analysis error:", error);
      toast({ title: "Analysis failed", description: "Could not analyze the proposal. Please try again.", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleTaskSelection = (index: number) => {
    setExtractedTasks(tasks => 
      tasks.map((task, i) => 
        i === index ? { ...task, selected: !task.selected } : task
      )
    );
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

    const selectedTasks = extractedTasks
      .filter(t => t.selected)
      .map(({ selected, ...task }) => ({
        title: task.title,
        description: task.description,
        priority: task.priority,
        estimatedHours: task.estimatedHours,
      }));

    createClient({
      name: name.trim(),
      industry,
      stage,
      ownerId: user.id,
      averageProgress: "0",
      revenueTotal: revenueValue.toString(),
      notes: notes.trim() || projectSummary || null,
      proposalFileName,
      proposalFileData,
      contactName: contactName.trim() || null,
      contactEmail: contactEmail.trim() || null,
      contactPhone: contactPhone.trim() || null,
    }, {
      onSuccess: async (newClient: any) => {
        if (selectedTasks.length > 0 && newClient?.id) {
          try {
            const result = await aiAPI.createTasksFromProposal(newClient.id, selectedTasks);
            toast({
              title: "Client created with tasks",
              description: result.message || `Created ${selectedTasks.length} tasks from proposal analysis.`
            });
          } catch (error) {
            console.error("Failed to create tasks:", error);
            toast({
              title: "Client created",
              description: "But failed to create tasks. You can add them manually.",
              variant: "destructive"
            });
          }
        } else if (proposalFile) {
          toast({
            title: "Client created with proposal",
            description: `${proposalFile.name} has been attached.`
          });
        }
        resetForm();
        onOpenChange(false);
      }
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProposalFile(file);
      
      if (file.type === "text/plain" || file.name.endsWith('.txt')) {
        const text = await file.text();
        setProposalText(text);
      }
      
      toast({
        title: "File selected",
        description: `${file.name} ready for analysis`
      });
    }
  };

  const isValid = name.trim() && industry;
  const priorityColors = {
    High: "bg-red-100 text-red-700 border-red-200",
    Medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
    Low: "bg-green-100 text-green-700 border-green-200",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="macos-panel border-none sm:max-w-[650px] p-0 overflow-hidden max-h-[90vh]">
        <div className="p-6 border-b border-black/5 bg-white/50">
          <DialogHeader>
            <DialogTitle className="text-xl">Add New Client</DialogTitle>
            <DialogDescription>Create a new client and optionally analyze a proposal to auto-generate tasks.</DialogDescription>
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

            <div className="space-y-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
              <Label className="flex items-center gap-2 text-primary font-medium">
                <Sparkles className="h-4 w-4" />
                AI Proposal Analysis
              </Label>
              <p className="text-xs text-muted-foreground">Upload a proposal or paste text below. AI will extract tasks and project details.</p>
              
              {proposalFile ? (
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/80 border border-primary/20">
                  <div className="flex items-center gap-2">
                    <FileUp className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium truncate max-w-[200px]">{proposalFile.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(proposalFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      setProposalFile(null);
                      setProposalText("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Input 
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileSelect}
                  className="macos-input cursor-pointer file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                  data-testid="input-proposal-file"
                />
              )}

              <Textarea 
                placeholder="Or paste proposal/contract text here..."
                className="macos-input min-h-[100px] resize-none text-sm"
                value={proposalText}
                onChange={(e) => setProposalText(e.target.value)}
                data-testid="input-proposal-text"
              />

              <Button 
                type="button"
                variant="outline"
                className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/10"
                onClick={handleAnalyzeProposal}
                disabled={isAnalyzing || (!proposalText.trim() && !proposalFile)}
                data-testid="button-analyze-proposal"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Analyze Proposal
                  </>
                )}
              </Button>
            </div>

            {showAnalysis && extractedTasks.length > 0 && (
              <div className="space-y-3 p-4 rounded-xl border border-green-200 bg-green-50/50">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <Label className="font-medium text-green-700">Extracted Tasks ({extractedTasks.filter(t => t.selected).length} selected)</Label>
                </div>
                
                {projectSummary && (
                  <p className="text-sm text-muted-foreground bg-white/60 p-2 rounded">{projectSummary}</p>
                )}

                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {extractedTasks.map((task, index) => (
                    <div 
                      key={index}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                        task.selected ? 'bg-white border-green-300' : 'bg-gray-50 border-gray-200 opacity-60'
                      }`}
                    >
                      <Checkbox 
                        checked={task.selected}
                        onCheckedChange={() => toggleTaskSelection(index)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{task.title}</span>
                          <Badge variant="outline" className={`text-xs ${priorityColors[task.priority]}`}>
                            {task.priority}
                          </Badge>
                          {task.estimatedHours > 0 && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {task.estimatedHours}h
                            </span>
                          )}
                        </div>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
            ) : extractedTasks.filter(t => t.selected).length > 0 ? (
              `Create Client & ${extractedTasks.filter(t => t.selected).length} Tasks`
            ) : (
              "Create Client"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
