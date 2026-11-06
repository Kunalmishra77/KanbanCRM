import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { aiAPI } from "@/lib/api";

type SuggestedTask = { title: string; description: string; priority: "High" | "Medium" | "Low"; estimatedHours: number };
type Analysis = {
  suggestedTasks: SuggestedTask[];
  projectSummary: string;
  keyDeliverables: string[];
  suggestedTimeline: string | null;
};

const MAX_CHARS = 30000;

export function ProposalAnalyzer({ clientId, clientName }: { clientId: string; clientName: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [analyzing, setAnalyzing] = useState(false);
  const [creating, setCreating] = useState(false);

  const reset = () => {
    setText("");
    setAnalysis(null);
    setSelected(new Set());
  };

  const analyze = async () => {
    setAnalyzing(true);
    try {
      const result: Analysis = await aiAPI.analyzeProposal(text, clientName);
      if (!result.suggestedTasks?.length) {
        toast({ title: "No tasks found", description: "The AI could not extract tasks from this text. Try pasting more of the proposal.", variant: "destructive" });
        return;
      }
      setAnalysis(result);
      setSelected(new Set(result.suggestedTasks.map((_, i) => i)));
    } catch (err: any) {
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const createTasks = async () => {
    if (!analysis) return;
    setCreating(true);
    try {
      const tasks = analysis.suggestedTasks.filter((_, i) => selected.has(i));
      await aiAPI.createTasksFromProposal(clientId, tasks);
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "stories" });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: `Created ${tasks.length} task${tasks.length === 1 ? "" : "s"}` });
      setOpen(false);
      reset();
    } catch (err: any) {
      toast({ title: "Could not create tasks", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const toggle = (i: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  return (
    <>
      <Button variant="outline" className="w-full sm:w-auto gap-2" onClick={() => setOpen(true)} data-testid="button-ai-tasks">
        <Sparkles className="h-4 w-4" />
        Tasks from Proposal
      </Button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create tasks from a proposal</DialogTitle>
            <DialogDescription>
              Paste the proposal text. AI will suggest tasks for {clientName}; pick the ones you want.
            </DialogDescription>
          </DialogHeader>

          {!analysis ? (
            <div className="space-y-2">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
                placeholder="Paste proposal or contract text here..."
                className="min-h-[220px]"
                data-testid="input-proposal-text"
              />
              <p className="text-xs text-muted-foreground text-right">{text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1">
                <p>{analysis.projectSummary}</p>
                {analysis.suggestedTimeline && <p className="text-muted-foreground">Timeline: {analysis.suggestedTimeline}</p>}
              </div>
              <div className="space-y-2">
                {analysis.suggestedTasks.map((t, i) => (
                  <label key={i} className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
                    <Checkbox checked={selected.has(i)} onCheckedChange={() => toggle(i)} className="mt-1" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-sm">{t.title}</span>
                        <Badge variant="outline" className="text-[10px]">{t.priority}</Badge>
                        <span className="text-xs text-muted-foreground">{t.estimatedHours}h</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {analysis ? (
              <>
                <Button variant="outline" onClick={reset}>Back</Button>
                <Button onClick={createTasks} disabled={selected.size === 0 || creating} data-testid="button-create-ai-tasks">
                  {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create {selected.size} task{selected.size === 1 ? "" : "s"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={analyze} disabled={text.trim().length < 50 || analyzing} data-testid="button-analyze-proposal">
                  {analyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Analyze
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
