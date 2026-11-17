import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { AtSign, Check, CornerDownRight, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MentionText, MentionTextarea } from "@/components/MentionTextarea";
import { useMentions, useMentionDone, type Mention } from "@/lib/overviewQueries";
import { useCreateComment } from "@/lib/queries";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

/**
 * @mentions as a small inbox. A mention stays here until you
 *  - reply on that story (any comment after the mention counts; one reply clears every earlier mention there), or
 *  - tick it Done (for "FYI" mentions that need no reply).
 * Answered and done ones stay findable under "Answered / done" for 14 days.
 */
export function MentionInbox() {
  const { data: mentions = [] } = useMentions();
  const done = useMentionDone();
  const [showResolved, setShowResolved] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const open = mentions.filter((m) => (m.state ?? "new") === "new");
  const resolved = mentions.filter((m) => m.state && m.state !== "new");
  if (mentions.length === 0) return null;
  const list = showAll ? open : open.slice(0, 3);

  return (
    <Card className={cn("macos-card border-none", open.length > 0 && "border-l-4 !border-l-primary")} data-testid="mentions-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex flex-wrap items-center gap-2">
          <AtSign className="h-4 w-4 text-primary" />
          {open.length > 0 ? `Mentioned you · ${open.length} to answer` : "Mentions · all answered"}
          {resolved.length > 0 && (
            <button type="button" className="ml-auto text-xs font-normal text-primary underline" onClick={() => setShowResolved(!showResolved)} data-testid="mentions-resolved-toggle">
              {showResolved ? "hide answered / done" : `answered / done (${resolved.length})`}
            </button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {list.map((m) => <MentionItem key={m.id} m={m} onDone={() => done.mutate(m.id)} />)}
        {open.length > 3 && <button type="button" className="text-xs text-primary underline px-2" onClick={() => setShowAll(!showAll)}>{showAll ? "show less" : `show all ${open.length}`}</button>}
        {open.length === 0 && !showResolved && <p className="text-sm text-muted-foreground px-2">Nothing waiting for your answer.</p>}
        {showResolved && (
          <div className="space-y-1 pt-1 border-t border-black/5 dark:border-white/10" data-testid="mentions-resolved">
            {resolved.map((m) => <MentionItem key={m.id} m={m} resolved />)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MentionItem({ m, onDone, resolved }: { m: Mention; onDone?: () => void; resolved?: boolean }) {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const createComment = useCreateComment();
  const author = m.authorName || "Someone";
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState(`@${author} `);

  const send = () => {
    if (!text.trim()) return;
    createComment.mutate({ storyId: m.storyId, data: { body: text.trim() } }, {
      onSuccess: () => { setReplying(false); qc.invalidateQueries({ queryKey: ["mentions"] }); qc.invalidateQueries({ queryKey: ["notifications"] }); },
    });
  };

  return (
    <div className={cn("rounded-xl px-2 py-2", resolved ? "opacity-60" : "bg-black/[0.02] dark:bg-white/[0.04]")} data-testid={resolved ? "mention-resolved" : "mention-item"}>
      <button type="button" onClick={() => setLocation(`/global-kanban?story=${m.storyId}`)} className="w-full min-w-0 text-left" title="Open the story">
        <span className="block text-sm break-words"><b>{author}</b>: <MentionText body={m.body} /></span>
        <span className="block text-xs text-muted-foreground truncate">
          {m.storyTitle} · {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}
          {resolved && ` · ${m.state === "answered" ? "you replied" : "marked done"}`}
        </span>
      </button>
      {!resolved && !replying && (
        <div className="flex gap-2 mt-1.5">
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setReplying(true)} data-testid="mention-reply">
            <CornerDownRight className="h-3.5 w-3.5" /> Reply
          </Button>
          <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-muted-foreground" onClick={onDone} title="No reply needed" data-testid="mention-done">
            <Check className="h-3.5 w-3.5" /> Done
          </Button>
        </div>
      )}
      {!resolved && replying && (
        <div className="mt-2 space-y-2">
          <MentionTextarea value={text} onChange={setText} rows={2} className="min-h-[64px] text-sm" data-testid="mention-reply-text" autoFocus />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" className="h-8" onClick={() => setReplying(false)}>Cancel</Button>
            <Button size="sm" className="h-8 text-white" disabled={!text.trim() || createComment.isPending} onClick={send} data-testid="mention-reply-send">
              {createComment.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}Send reply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
