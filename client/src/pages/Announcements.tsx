import { useState } from "react";
import { useAnnouncements, useCreateAnnouncement, useUpdateAnnouncement, useDeleteAnnouncement } from "@/lib/queries";
import { useIsOwner, useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pin, Pencil, Trash2, Loader2, Megaphone } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type Announcement = {
  id: string;
  title: string;
  body: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt?: string;
};

type AnnouncementForm = {
  title: string;
  body: string;
  isPinned: boolean;
};

const defaultForm: AnnouncementForm = {
  title: "",
  body: "",
  isPinned: false,
};

export default function Announcements() {
  const { data: announcements = [], isLoading } = useAnnouncements();
  const { mutate: createAnnouncement, isPending: isCreating } = useCreateAnnouncement();
  const { mutate: updateAnnouncement, isPending: isUpdating } = useUpdateAnnouncement();
  const { mutate: deleteAnnouncement } = useDeleteAnnouncement();
  const isOwner = useIsOwner();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [toDelete, setToDelete] = useState<Announcement | null>(null);
  const [form, setForm] = useState<AnnouncementForm>(defaultForm);

  // Sort: pinned first, then by date descending
  const sorted = [...announcements].sort((a: Announcement, b: Announcement) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const openAddModal = () => {
    setEditingAnnouncement(null);
    setForm(defaultForm);
    setIsModalOpen(true);
  };

  const openEditModal = (ann: Announcement) => {
    setEditingAnnouncement(ann);
    setForm({ title: ann.title, body: ann.body, isPinned: ann.isPinned });
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast({ title: "Title and body are required", variant: "destructive" });
      return;
    }
    const data = {
      title: form.title.trim(),
      body: form.body.trim(),
      isPinned: form.isPinned,
    };
    if (editingAnnouncement) {
      updateAnnouncement({ id: editingAnnouncement.id, data }, { onSuccess: () => setIsModalOpen(false) });
    } else {
      createAnnouncement(data, { onSuccess: () => setIsModalOpen(false) });
    }
  };

  const handleTogglePin = (ann: Announcement) => {
    updateAnnouncement({ id: ann.id, data: { isPinned: !ann.isPinned } });
  };

  const handleDelete = () => {
    if (!toDelete) return;
    deleteAnnouncement(toDelete.id, { onSuccess: () => setToDelete(null) });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Announcements</h1>
          <p className="text-muted-foreground mt-1">
            Company-wide notices and updates for the team.
          </p>
        </div>
        {isOwner && (
          <Button className="gap-2 shadow-lg shadow-primary/20" onClick={openAddModal}>
            <Plus className="h-4 w-4" />
            Post Announcement
          </Button>
        )}
      </div>

      {/* Announcements List */}
      {sorted.length === 0 ? (
        <div className="macos-card p-16 text-center">
          <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground font-medium">No announcements yet</p>
          {isOwner && (
            <p className="text-sm text-muted-foreground mt-1">
              Post an announcement to notify your team.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map((ann: Announcement) => (
            <div
              key={ann.id}
              className={`macos-card p-5 space-y-3 ${ann.isPinned ? "border border-primary/20 ring-1 ring-primary/10" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {ann.isPinned && (
                    <Badge className="bg-primary/10 text-primary border-0 gap-1 text-xs">
                      <Pin className="h-3 w-3" />
                      Pinned
                    </Badge>
                  )}
                  <h2 className="font-semibold text-base">{ann.title}</h2>
                </div>
                {isOwner && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-7 w-7 ${ann.isPinned ? "text-primary" : "text-muted-foreground"}`}
                      onClick={() => handleTogglePin(ann)}
                      title={ann.isPinned ? "Unpin" : "Pin"}
                    >
                      <Pin className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      onClick={() => openEditModal(ann)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setToDelete(ann)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {ann.body}
              </p>

              <p className="text-xs text-muted-foreground">
                Posted {format(new Date(ann.createdAt), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Post / Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="macos-panel sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAnnouncement ? "Edit Announcement" : "Post Announcement"}</DialogTitle>
            <DialogDescription>
              {editingAnnouncement ? "Update this announcement." : "Post a new announcement for the team."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="ann-title">Title *</Label>
              <Input
                id="ann-title"
                placeholder="Announcement title"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ann-body">Body *</Label>
              <Textarea
                id="ann-body"
                placeholder="Write the announcement content here..."
                value={form.body}
                onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
                rows={5}
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                id="ann-pinned"
                type="checkbox"
                className="h-4 w-4 accent-primary cursor-pointer"
                checked={form.isPinned}
                onChange={(e) => setForm((p) => ({ ...p, isPinned: e.target.checked }))}
              />
              <Label htmlFor="ann-pinned" className="cursor-pointer flex items-center gap-1.5">
                <Pin className="h-3.5 w-3.5 text-primary" />
                Pin this announcement
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isCreating || isUpdating}>
              {(isCreating || isUpdating) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingAnnouncement ? "Update" : "Post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent className="macos-panel">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{toDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
