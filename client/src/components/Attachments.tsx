import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, ExternalLink, FileText, Image as ImageIcon, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Attachment = { id: string; name: string; type: string | null; url: string; by?: string | null };

export const isImage = (a: Pick<Attachment, "type" | "name">) =>
  !!a.type?.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(a.name);

/** Link that saves the file under its own name. Stored files: the server sends it as a download (?download=1). */
export function downloadHref(a: Attachment) {
  return /^\/api\/files\//.test(a.url) ? `${a.url}${a.url.includes("?") ? "&" : "?"}download=1` : a.url;
}
/** Older attachments were saved inside the comment (data: URL); the browser downloads those itself. */
const needsDownloadAttr = (a: Attachment) => a.url.startsWith("data:");

/** View (in the browser) and Download buttons for one file. */
export function FileActions({ a, onView, compact }: { a: Attachment; onView?: () => void; compact?: boolean }) {
  const viewProps = onView ? { onClick: onView } : { href: a.url, target: "_blank", rel: "noopener noreferrer" };
  const ViewTag: any = onView ? "button" : "a";
  return (
    <div className={cn("flex items-center gap-1.5 shrink-0", compact && "gap-1")}>
      <ViewTag {...viewProps} type={onView ? "button" : undefined} className="inline-flex items-center gap-1 rounded-md border px-2 h-8 text-xs hover:bg-black/5 dark:hover:bg-white/10" data-testid="file-view">
        <ExternalLink className="h-3.5 w-3.5" />{!compact && "View"}
      </ViewTag>
      <a href={downloadHref(a)} download={needsDownloadAttr(a) ? a.name : undefined} className="inline-flex items-center gap-1 rounded-md border px-2 h-8 text-xs hover:bg-black/5 dark:hover:bg-white/10" data-testid="file-download">
        <Download className="h-3.5 w-3.5" />{!compact && "Download"}
      </a>
    </div>
  );
}

/** Full-screen image viewer with Download / Open and arrows through all images of the story. */
export function ImageViewer({ images, index, onIndex, onClose }: { images: Attachment[]; index: number | null; onIndex: (i: number) => void; onClose: () => void }) {
  const a = index === null ? null : images[index];
  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && index < images.length - 1) onIndex(index + 1);
      if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, images.length, onIndex]);
  return (
    <Dialog open={!!a} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-6xl w-[calc(100vw-1rem)] h-[calc(100vh-2rem)] p-0 gap-0 !bg-black border-none shadow-2xl [&>button]:hidden flex flex-col" data-testid="image-viewer">
        <DialogTitle className="sr-only">{a?.name || "Image"}</DialogTitle>
        <DialogDescription className="sr-only">Image attached to this story</DialogDescription>
        {a && (
          <>
            <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{a.name}</p>
                <p className="text-xs text-white/60">{index! + 1} of {images.length}{a.by ? ` · ${a.by}` : ""}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a href={a.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md bg-white/10 hover:bg-white/20 px-3 h-9 text-sm"><ExternalLink className="h-4 w-4" />Open</a>
                <a href={downloadHref(a)} download={needsDownloadAttr(a) ? a.name : undefined} className="inline-flex items-center gap-1 rounded-md bg-white/10 hover:bg-white/20 px-3 h-9 text-sm" data-testid="viewer-download"><Download className="h-4 w-4" />Download</a>
                <button type="button" onClick={onClose} aria-label="Close" className="inline-flex items-center justify-center rounded-md bg-white/10 hover:bg-white/20 h-9 w-9"><X className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="relative flex-1 min-h-0 flex items-center justify-center px-12 pb-6">
              <img src={a.url} alt={a.name} className="max-h-full max-w-full object-contain rounded" data-testid="viewer-image" />
              {index! > 0 && (
                <button type="button" onClick={() => onIndex(index! - 1)} aria-label="Previous image" className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center"><ChevronLeft className="h-5 w-5" /></button>
              )}
              {index! < images.length - 1 && (
                <button type="button" onClick={() => onIndex(index! + 1)} aria-label="Next image" className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center" data-testid="viewer-next"><ChevronRight className="h-5 w-5" /></button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** "Attachments (n)": every image and file posted in this story, in one place. */
export function AttachmentStrip({ items, onOpenImage }: { items: Attachment[]; onOpenImage: (a: Attachment) => void }) {
  const [all, setAll] = useState(false);
  if (items.length === 0) return null;
  const shown = all ? items : items.slice(0, 6);
  return (
    <div className="space-y-2" data-testid="attachments-strip">
      <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Attachments ({items.length})</p>
      <div className="grid grid-cols-1 gap-2">
        {shown.map((a) => (
          <div key={a.id} className="flex items-center gap-2 rounded-lg border bg-white/40 dark:bg-white/[0.05] p-2 min-w-0">
            {isImage(a) ? (
              <button type="button" onClick={() => onOpenImage(a)} className="shrink-0" aria-label={`View ${a.name}`}>
                <img src={a.url} alt="" className="h-10 w-10 rounded object-cover border" />
              </button>
            ) : (
              <span className="h-10 w-10 shrink-0 rounded bg-primary/10 text-primary flex items-center justify-center"><FileText className="h-5 w-5" /></span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate" title={a.name}>{a.name}</p>
              {a.by && <p className="text-[11px] text-muted-foreground truncate">{a.by}</p>}
            </div>
            <FileActions a={a} compact onView={isImage(a) ? () => onOpenImage(a) : undefined} />
          </div>
        ))}
      </div>
      {items.length > 6 && (
        <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setAll((v) => !v)}>{all ? "Show fewer" : `Show all ${items.length}`}</button>
      )}
    </div>
  );
}

export { ImageIcon };
