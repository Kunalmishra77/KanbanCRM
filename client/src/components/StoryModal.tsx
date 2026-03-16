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
import { Calendar, Clock, Paperclip, Send, Wand2, Mail, CheckCircle2, X, FileUp, Loader2, Image, FileText, Trash2, History } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useComments, useCreateComment, useUpdateStory, useDeleteStory, useSentEmails, useCreateSentEmail } from "@/lib/queries";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

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

type ClientData = {
  id: string;
  name: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
};

interface StoryModalProps {
  story: StoryData | null;
  client?: ClientData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StoryModal({ story, client, open, onOpenChange }: StoryModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("details");
  const [newComment, setNewComment] = useState("");
  const [commentAttachment, setCommentAttachment] = useState<File | null>(null);
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [emailNotes, setEmailNotes] = useState("");
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [showAttachmentUpload, setShowAttachmentUpload] = useState(false);
  const [showTimeLog, setShowTimeLog] = useState(false);
  const [timeLogHours, setTimeLogHours] = useState("");
  const [timeLogNote, setTimeLogNote] = useState("");
  const [localProgress, setLocalProgress] = useState<number>(story?.progressPercent || 0);

  // Sync local progress when story prop changes (e.g., when modal opens with different story)
  useEffect(() => {
    setLocalProgress(story?.progressPercent || 0);
  }, [story?.id, story?.progressPercent]);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: comments = [], isLoading: isLoadingComments } = useComments(story?.id || '');
  const { data: sentEmails = [], isLoading: isLoadingSentEmails, refetch: refetchEmails } = useSentEmails(story?.id || '');
  const { mutate: createComment, isPending: isPostingComment } = useCreateComment();
  const { mutate: updateStory } = useUpdateStory();
  const { mutate: deleteStory } = useDeleteStory();
  const { mutate: createSentEmail, isPending: isSendingEmail } = useCreateSentEmail();
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  if (!story) return null;

  const handlePostComment = async () => {
    if (!newComment.trim() && !commentAttachment) return;

    const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Anonymous';

    let attachmentData: string | null = null;
    let attachmentName: string | null = null;
    let attachmentType: string | null = null;

    // Upload attachment to Supabase storage if provided
    if (commentAttachment) {
      setIsUploadingAttachment(true);
      try {
        const formData = new FormData();
        formData.append('file', commentAttachment);
        formData.append('bucket', 'attachments');

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload attachment');
        }

        const { publicUrl, fileName } = await uploadResponse.json();
        attachmentData = publicUrl;
        attachmentName = fileName;
        attachmentType = commentAttachment.type;
      } catch (error: any) {
        console.error('Upload error:', error);
        toast({
          title: "Upload Failed",
          description: error.message || "Failed to upload attachment",
          variant: "destructive"
        });
        setIsUploadingAttachment(false);
        return;
      }
      setIsUploadingAttachment(false);
    }

    createComment({
      storyId: story.id,
      data: {
        storyId: story.id,
        authorId: user?.id || 'system',
        authorName: userName,
        body: newComment.trim() || (attachmentName ? `Attached: ${attachmentName}` : ''),
        attachmentName,
        attachmentType,
        attachmentData,
      }
    }, {
      onSuccess: () => {
        setNewComment("");
        setCommentAttachment(null);
      }
    });
  };

  const handleGenerateDraft = async () => {
    setIsGeneratingEmail(true);

    try {
      const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'The Team' : 'The Team';

      const response = await fetch(`/api/stories/${story.id}/generate-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userNotes: emailNotes,
          progressPercent: localProgress,
          senderName: userName
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate email');
      }

      const result = await response.json();
      setDraftSubject(result.subject);
      setDraftBody(result.body);

      toast({
        title: "Email generated",
        description: "AI has drafted your email. Feel free to edit it before sending."
      });
    } catch (error) {
      console.error('Error generating email:', error);
      toast({
        title: "Generation failed",
        description: "Could not generate email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingEmail(false);
    }
  };

  const handleDiscardDraft = () => {
    setDraftSubject("");
    setDraftBody("");
    toast({ title: "Draft discarded" });
  };

  const handleSendEmail = async () => {
    if (!draftSubject.trim() || !draftBody.trim()) {
      toast({ title: "Please fill in subject and body", variant: "destructive" });
      return;
    }

    const emailText = `Subject: ${draftSubject}\n\nTo: ${client?.contactName || 'Client'}${client?.contactEmail ? ` <${client.contactEmail}>` : ''}\n\n${draftBody}`;

    try {
      await navigator.clipboard.writeText(emailText);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }

    createSentEmail({
      storyId: story.id,
      data: {
        subject: draftSubject,
        body: draftBody,
        status: 'sent',
        recipientEmail: client?.contactEmail || null,
        recipientName: client?.contactName || null,
      }
    }, {
      onSuccess: () => {
        toast({
          title: "Email saved & copied",
          description: `Email copied to clipboard. Paste it in your email client to send to ${client?.contactName || 'client'}.`
        });
        setDraftSubject("");
        setDraftBody("");
        refetchEmails();
      },
      onError: () => {
        toast({
          title: "Failed to save email",
          variant: "destructive"
        });
      }
    });
  };

  const handleLogTime = () => {
    const hours = parseFloat(timeLogHours);
    if (isNaN(hours) || hours <= 0) {
      toast({ title: "Please enter valid hours", variant: "destructive" });
      return;
    }
    const currentActual = parseFloat((story as any).actualHoursSpent || '0') || 0;
    updateStory({
      id: story.id,
      data: { actualHoursSpent: String(currentActual + hours) }
    });
    toast({ title: "Time logged", description: `${hours}h added to "${story.title}"` });
    setTimeLogHours("");
    setTimeLogNote("");
    setShowTimeLog(false);
  };

  const handleAttachmentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      toast({
        title: "File attached",
        description: `${files[0].name} has been attached to this story.`
      });
      setShowAttachmentUpload(false);
    }
  };

  const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'User';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl h-[85vh] p-0 gap-0 overflow-hidden glass-panel border-white/20">
          <div className="flex h-full overflow-hidden">
            {/* Left Sidebar: Meta & Status */}
            <ScrollArea className="w-72 bg-muted/30 border-r border-white/10">
              <div className="p-6 flex flex-col gap-6">
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
            </ScrollArea>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="p-6 border-b border-white/10">
                <DialogHeader>
                  <div className="flex items-start justify-between gap-4">
                    <DialogTitle className="text-2xl font-bold leading-tight">{story.title}</DialogTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className={cn("rounded-full h-8 w-8", showAttachmentUpload && "bg-primary/10 border-primary")}
                        onClick={() => setShowAttachmentUpload(!showAttachmentUpload)}
                        data-testid="button-attachment"
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className={cn("rounded-full h-8 w-8", showTimeLog && "bg-primary/10 border-primary")}
                        onClick={() => setShowTimeLog(!showTimeLog)}
                        data-testid="button-time-log"
                      >
                        <Clock className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-full h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive"
                        onClick={() => setShowDeleteConfirm(true)}
                        data-testid="button-delete-story"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <DialogDescription className="mt-2 text-base">
                    Client: <span className="font-medium text-primary">{client?.name || 'Unknown Client'}</span>
                    {client?.contactName && (
                      <span className="text-muted-foreground"> ({client.contactName})</span>
                    )}
                  </DialogDescription>
                </DialogHeader>

                {/* Attachment Upload Panel */}
                {showAttachmentUpload && (
                  <div className="mt-4 p-4 rounded-lg bg-white/40 border border-white/20 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <FileUp className="h-4 w-4" />
                        Attach File
                      </h4>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowAttachmentUpload(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input
                      type="file"
                      onChange={handleAttachmentSelect}
                      className="bg-white/60"
                      data-testid="input-attachment"
                    />
                  </div>
                )}

                {/* Time Log Panel */}
                {showTimeLog && (
                  <div className="mt-4 p-4 rounded-lg bg-white/40 border border-white/20 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Log Time
                      </h4>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowTimeLog(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Hours</Label>
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          placeholder="e.g., 2.5"
                          value={timeLogHours}
                          onChange={(e) => setTimeLogHours(e.target.value)}
                          className="bg-white/60"
                          data-testid="input-time-hours"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Note (optional)</Label>
                        <Input
                          placeholder="What did you work on?"
                          value={timeLogNote}
                          onChange={(e) => setTimeLogNote(e.target.value)}
                          className="bg-white/60"
                          data-testid="input-time-note"
                        />
                      </div>
                    </div>
                    <Button size="sm" className="mt-3 w-full" onClick={handleLogTime} data-testid="button-log-time">
                      Log Time
                    </Button>
                  </div>
                )}
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                <div className="px-6 pt-4 border-b border-white/10 bg-white/20">
                  <TabsList className="bg-transparent p-0 gap-6 h-auto">
                    <TabsTrigger
                      value="details"
                      className="bg-transparent p-0 pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none transition-all"
                      data-testid="tab-overview"
                    >
                      Overview
                    </TabsTrigger>
                    <TabsTrigger
                      value="comments"
                      className="bg-transparent p-0 pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none transition-all"
                      data-testid="tab-comments"
                    >
                      Comments ({comments.length})
                    </TabsTrigger>
                    <TabsTrigger
                      value="email"
                      className="bg-transparent p-0 pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none transition-all"
                      data-testid="tab-email"
                    >
                      Email Draft
                    </TabsTrigger>
                    <TabsTrigger
                      value="emails"
                      className="bg-transparent p-0 pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none transition-all"
                      data-testid="tab-emails"
                    >
                      Emails ({sentEmails.length})
                    </TabsTrigger>
                  </TabsList>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-6">
                    <TabsContent value="details" className="mt-0 space-y-6 outline-none">
                      <div className="space-y-2">
                        <Label className="text-muted-foreground text-xs uppercase tracking-wider">Description</Label>
                        <div className="min-h-[150px] p-4 rounded-lg bg-white/40 border border-white/20 text-sm leading-relaxed">
                          {story.description || 'No description provided.'}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-muted-foreground text-xs uppercase tracking-wider">Progress</Label>
                          <span className="text-sm font-medium">{localProgress}%</span>
                        </div>
                        <div className="relative h-4 w-full bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-500"
                            style={{ width: `${localProgress}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={localProgress}
                            onChange={(e) => {
                              const newProgress = parseInt(e.target.value);
                              setLocalProgress(newProgress); // Update local state immediately
                              updateStory({
                                id: story.id,
                                data: { progressPercent: newProgress }
                              });
                              toast({
                                title: "Progress updated",
                                description: `Progress set to ${newProgress}%`
                              });
                            }}
                            className="flex-1 h-2 accent-primary cursor-pointer"
                            data-testid="input-progress-slider"
                          />
                          <div className="flex gap-1">
                            {[0, 25, 50, 75, 100].map((val) => (
                              <Button
                                key={val}
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  "h-7 px-2 text-xs",
                                  localProgress === val && "bg-primary/10 text-primary"
                                )}
                                onClick={() => {
                                  setLocalProgress(val); // Update local state immediately
                                  updateStory({
                                    id: story.id,
                                    data: { progressPercent: val }
                                  });
                                  toast({
                                    title: "Progress updated",
                                    description: `Progress set to ${val}%`
                                  });
                                }}
                                data-testid={`button-progress-${val}`}
                              >
                                {val}%
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="comments" className="mt-0 space-y-6 outline-none">
                      {isLoadingComments ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {comments.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No comments yet. Be the first to comment!</p>
                          ) : (
                            comments.map((comment: any) => (
                              <div key={comment.id} className="flex gap-4 group" data-testid={`comment-${comment.id}`}>
                                <Avatar className="h-8 w-8 mt-1">
                                  <AvatarFallback>{(comment.authorName || 'U').charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium">{comment.authorName || 'Unknown'}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {comment.createdAt ? format(new Date(comment.createdAt), 'MMM d, h:mm a') : ''}
                                    </p>
                                  </div>
                                  <div className="p-3 rounded-r-xl rounded-bl-xl bg-white/50 text-sm border border-white/10 shadow-sm space-y-2">
                                    {comment.body}
                                    {comment.attachmentData && comment.attachmentName && (
                                      <div className="mt-2 pt-2 border-t border-white/20">
                                        {comment.attachmentType?.startsWith('image/') ? (
                                          <div className="space-y-1">
                                            <img
                                              src={comment.attachmentData}
                                              alt={comment.attachmentName}
                                              className="max-w-full max-h-48 rounded-lg border border-white/20"
                                            />
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                              <Image className="h-3 w-3" />
                                              {comment.attachmentName}
                                            </p>
                                          </div>
                                        ) : (
                                          <a
                                            href={comment.attachmentData}
                                            target={comment.attachmentData.startsWith('http') ? '_blank' : undefined}
                                            download={!comment.attachmentData.startsWith('http') ? comment.attachmentName : undefined}
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-primary text-sm"
                                          >
                                            <FileText className="h-4 w-4" />
                                            {comment.attachmentName}
                                          </a>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      <div className="flex gap-4 items-start mt-8 pt-6 border-t border-white/10">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{userName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 gap-2 flex flex-col">
                          <Textarea
                            placeholder="Write a comment..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            className="bg-white/40 border-white/20 min-h-[80px] resize-none"
                            data-testid="input-comment"
                          />

                          {commentAttachment && (
                            <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
                              {commentAttachment.type.startsWith('image/') ? (
                                <Image className="h-4 w-4 text-primary" />
                              ) : (
                                <FileText className="h-4 w-4 text-primary" />
                              )}
                              <span className="text-sm flex-1 truncate">{commentAttachment.name}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setCommentAttachment(null)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}

                          <div className="flex justify-between items-center">
                            <label className="cursor-pointer">
                              <Input
                                type="file"
                                className="hidden"
                                accept="image/*,.pdf,.doc,.docx,.txt"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) setCommentAttachment(file);
                                }}
                                data-testid="input-comment-attachment"
                              />
                              <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-white/40">
                                <Paperclip className="h-4 w-4" />
                                Attach file
                              </div>
                            </label>
                            <Button
                              size="sm"
                              className="gap-2"
                              onClick={handlePostComment}
                              disabled={(!newComment.trim() && !commentAttachment) || isPostingComment || isUploadingAttachment}
                              data-testid="button-post-comment"
                            >
                              {(isPostingComment || isUploadingAttachment) ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Send className="h-3 w-3" />
                              )}
                              {isUploadingAttachment ? "Uploading..." : "Post"}
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
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                              Notes to Include (optional)
                            </Label>
                            <Textarea
                              value={emailNotes}
                              onChange={(e) => setEmailNotes(e.target.value)}
                              placeholder="Add any specific points you want to mention in the email... (e.g., 'We completed the design phase', 'Need client approval on mockups', 'Schedule a call for next week')"
                              className="min-h-[80px] bg-white/60 text-sm"
                              data-testid="input-email-notes"
                            />
                            <p className="text-xs text-muted-foreground">
                              The AI will use task details, progress, comments, and your notes to generate a professional email.
                            </p>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-2 border-primary/20 hover:bg-primary/10"
                            onClick={handleGenerateDraft}
                            disabled={isGeneratingEmail}
                            data-testid="button-generate-draft"
                          >
                            {isGeneratingEmail ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Wand2 className="h-4 w-4" />
                                Generate with AI
                              </>
                            )}
                          </Button>

                          {(draftSubject || draftBody) && (
                            <>
                              <Separator />
                              <div className="space-y-2">
                                <Label>Subject</Label>
                                <Input
                                  value={draftSubject}
                                  onChange={(e) => setDraftSubject(e.target.value)}
                                  placeholder="Subject line..."
                                  className="bg-white/60"
                                  data-testid="input-email-subject"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Body</Label>
                                <Textarea
                                  value={draftBody}
                                  onChange={(e) => setDraftBody(e.target.value)}
                                  placeholder="Email content..."
                                  className="min-h-[200px] bg-white/60 font-mono text-sm"
                                  data-testid="input-email-body"
                                />
                              </div>
                            </>
                          )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <Button
                            variant="ghost"
                            onClick={handleDiscardDraft}
                            data-testid="button-discard-draft"
                          >
                            Discard
                          </Button>
                          <Button
                            className="gap-2"
                            onClick={handleSendEmail}
                            disabled={isSendingEmail}
                            data-testid="button-send-email"
                          >
                            {isSendingEmail ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Send className="h-3 w-3" />
                            )}
                            Save & Copy
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground text-center mt-2">
                          Note: This saves the email to your history. Copy the content and paste it in your email client to send.
                        </p>
                      </div>
                    </TabsContent>

                    <TabsContent value="emails" className="mt-0 space-y-4 outline-none">
                      {isLoadingSentEmails ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : sentEmails.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No emails sent yet.</p>
                          <p className="text-sm mt-1">Use the "Email Draft" tab to generate and save emails.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {sentEmails.map((email: any) => (
                            <div key={email.id} className="p-4 rounded-xl border border-white/20 bg-white/30" data-testid={`email-${email.id}`}>
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4 text-primary" />
                                  <span className="font-medium text-sm">{email.subject}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {email.sentAt ? format(new Date(email.sentAt), 'MMM d, yyyy h:mm a') : ''}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground mb-2">
                                To: {email.recipientName || 'Client'} {email.recipientEmail && `<${email.recipientEmail}>`}
                              </div>
                              <div className="p-3 rounded-lg bg-white/40 text-sm whitespace-pre-wrap border border-white/10">
                                {email.body}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </div>
                </ScrollArea>
              </Tabs>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="macos-panel">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Story</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{story.title}"? This will also delete all comments associated with this story. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                deleteStory(story.id);
                setShowDeleteConfirm(false);
                onOpenChange(false);
              }}
              data-testid="button-confirm-delete-story"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
