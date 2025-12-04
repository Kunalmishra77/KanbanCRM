import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COMMENTS, USERS } from "@/lib/mockData";
import { Calendar, Clock, Paperclip, Send, Wand2, Mail, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { cn } from "@/lib/utils";

type StoryData = {
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

interface StoryModalProps {
  story: StoryData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StoryModal({ story, open, onOpenChange }: StoryModalProps) {
  const [activeTab, setActiveTab] = useState("details");
  const [newComment, setNewComment] = useState("");
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");

  if (!story) return null;

  const storyComments = COMMENTS.filter(c => c.storyId === story.id);

  const handleGenerateDraft = () => {
    setDraftSubject(`Update on: ${story.title}`);
    const dueDate = story.dueDate ? format(new Date(story.dueDate), 'MMM d') : 'soon';
    setDraftBody(`Hi ${story.person || 'there'},\n\nI wanted to give you a quick update on "${story.title}".\n\nWe are currently making good progress (about ${story.progressPercent || 0}% complete). We expect to have this ready by ${dueDate}.\n\nLet me know if you have any questions.\n\nBest,\nThe Team`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] p-0 gap-0 overflow-hidden glass-panel border-white/20">
        <div className="flex h-full">
          {/* Left Sidebar: Meta & Status */}
          <div className="w-72 bg-muted/30 border-r border-white/10 p-6 flex flex-col gap-6">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Status</h4>
              <Badge variant="outline" className={cn(
                "w-full justify-center py-1.5 text-sm",
                story.status === 'Done' ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-white/50"
              )}>
                {story.status}
              </Badge>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Assignee</h4>
              <div className="flex items-center gap-3 p-2 rounded-lg bg-white/40 border border-white/20">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{(story.person || 'U').charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="overflow-hidden">
                  <p className="text-sm font-medium truncate">{story.person || 'Unassigned'}</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Details</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Priority</span>
                  <span className="font-medium">{story.priority}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimate</span>
                  <span className="font-medium">{story.estimatedEffortHours || 0}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due Date</span>
                  <span className="font-medium">{story.dueDate ? format(new Date(story.dueDate), 'MMM d') : 'Not set'}</span>
                </div>
              </div>
            </div>

            <div className="mt-auto">
               <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Tags</h4>
               <div className="flex flex-wrap gap-2">
                 {(story.tags || []).map(tag => (
                   <Badge key={tag} variant="secondary" className="text-xs bg-white/50 hover:bg-white/70 transition-colors">
                     {tag}
                   </Badge>
                 ))}
               </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="p-6 border-b border-white/10">
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <DialogTitle className="text-2xl font-bold leading-tight">{story.title}</DialogTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="rounded-full h-8 w-8">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="rounded-full h-8 w-8">
                      <Clock className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <DialogDescription className="mt-2 text-base">
                  Client: <span className="font-medium text-primary">{story.person}</span>
                </DialogDescription>
              </DialogHeader>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
              <div className="px-6 pt-4 border-b border-white/10 bg-white/20">
                <TabsList className="bg-transparent p-0 gap-6 h-auto">
                  <TabsTrigger 
                    value="details" 
                    className="bg-transparent p-0 pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none transition-all"
                  >
                    Overview
                  </TabsTrigger>
                  <TabsTrigger 
                    value="comments" 
                    className="bg-transparent p-0 pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none transition-all"
                  >
                    Comments ({storyComments.length})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="email" 
                    className="bg-transparent p-0 pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none transition-all"
                  >
                    Email Draft
                  </TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-6">
                  <TabsContent value="details" className="mt-0 space-y-6 outline-none">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-xs uppercase tracking-wider">Description</Label>
                      <div className="min-h-[150px] p-4 rounded-lg bg-white/40 border border-white/20 text-sm leading-relaxed">
                        {story.description}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-xs uppercase tracking-wider">Progress</Label>
                      <div className="relative h-4 w-full bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-500" 
                          style={{ width: `${story.progressPercent || 0}%` }} 
                        />
                      </div>
                      <p className="text-right text-xs text-muted-foreground">{story.progressPercent || 0}% Complete</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="comments" className="mt-0 space-y-6 outline-none">
                    <div className="space-y-6">
                      {storyComments.map(comment => {
                        const author = USERS.find(u => u.id === comment.authorId);
                        return (
                          <div key={comment.id} className="flex gap-4 group">
                            <Avatar className="h-8 w-8 mt-1">
                              <AvatarImage src={author?.avatarUrl} />
                              <AvatarFallback>{author?.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium">{author?.name}</p>
                                <p className="text-xs text-muted-foreground">{format(new Date(comment.createdAt), 'MMM d, h:mm a')}</p>
                              </div>
                              <div className="p-3 rounded-r-xl rounded-bl-xl bg-white/50 text-sm border border-white/10 shadow-sm">
                                {comment.body}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="flex gap-4 items-start mt-8 pt-6 border-t border-white/10">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={USERS[0].avatarUrl} />
                        <AvatarFallback>Me</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 gap-2 flex flex-col">
                        <Textarea 
                          placeholder="Write a comment..." 
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          className="bg-white/40 border-white/20 min-h-[80px] resize-none"
                        />
                        <div className="flex justify-end">
                           <Button size="sm" className="gap-2">
                             <Send className="h-3 w-3" /> Post
                           </Button>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="email" className="mt-0 space-y-6 outline-none">
                    <div className="grid gap-4 p-6 rounded-xl border border-white/20 bg-white/30">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium flex items-center gap-2">
                          <Mail className="h-4 w-4 text-primary" />
                          Draft Email to Client
                        </h3>
                        <Button variant="ghost" size="sm" className="text-primary gap-2 hover:bg-primary/10" onClick={handleGenerateDraft}>
                          <Wand2 className="h-3 w-3" />
                          Generate with AI
                        </Button>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Subject</Label>
                          <Input 
                            value={draftSubject} 
                            onChange={(e) => setDraftSubject(e.target.value)}
                            placeholder="Subject line..." 
                            className="bg-white/60"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Body</Label>
                          <Textarea 
                            value={draftBody}
                            onChange={(e) => setDraftBody(e.target.value)}
                            placeholder="Email content..." 
                            className="min-h-[200px] bg-white/60 font-mono text-sm"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost">Discard</Button>
                        <Button className="gap-2">
                          <Send className="h-3 w-3" />
                          Send Email
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </ScrollArea>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
