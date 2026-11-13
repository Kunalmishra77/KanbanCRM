import { useMemo, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useUsers } from "@/lib/queries";
import { cn } from "@/lib/utils";

const norm = (s: string) => s.replace(/\s+/g, " ").trim();
const fullNameOf = (u: any) => norm(`${u.firstName || ""} ${u.lastName || ""}`);

type Props = Omit<React.ComponentProps<typeof Textarea>, "onChange" | "value"> & { value: string; onChange: (v: string) => void };

/** Textarea where typing "@" offers the team to pick from. The comment keeps plain text: "@Full Name". */
export function MentionTextarea({ value, onChange, className, ...rest }: Props) {
  const { data: users = [] } = useUsers();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [start, setStart] = useState(0);
  const [active, setActive] = useState(0);

  const people = useMemo(
    () => (users as any[]).map((u) => ({ id: u.id, name: fullNameOf(u), team: u.team as string | null })).filter((u) => u.name),
    [users],
  );
  const matches = useMemo(() => {
    if (query === null) return [];
    const q = query.toLowerCase();
    return people.filter((p) => p.name.toLowerCase().split(" ").some((w) => w.startsWith(q)) || p.name.toLowerCase().includes(q)).slice(0, 6);
  }, [people, query]);

  const detect = (text: string, caret: number) => {
    const before = text.slice(0, caret);
    const at = before.lastIndexOf("@");
    if (at === -1 || (at > 0 && !/\s/.test(before[at - 1]))) return setQuery(null);
    const token = before.slice(at + 1);
    if (/\n/.test(token) || token.length > 30) return setQuery(null);
    setStart(at);
    setQuery(token);
    setActive(0);
  };

  const pick = (name: string) => {
    const caret = ref.current?.selectionStart ?? value.length;
    const next = value.slice(0, start) + "@" + name + " " + value.slice(caret);
    onChange(next);
    setQuery(null);
    const pos = start + name.length + 2;
    requestAnimationFrame(() => { ref.current?.focus(); ref.current?.setSelectionRange(pos, pos); });
  };

  return (
    <div className="relative">
      <Textarea
        {...rest}
        ref={ref}
        value={value}
        className={className}
        onChange={(e) => { onChange(e.target.value); detect(e.target.value, e.target.selectionStart); }}
        onClick={(e) => detect(value, (e.target as HTMLTextAreaElement).selectionStart)}
        onKeyDown={(e) => {
          if (query === null || matches.length === 0) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % matches.length); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a - 1 + matches.length) % matches.length); }
          else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pick(matches[active].name); }
          else if (e.key === "Escape") { e.preventDefault(); setQuery(null); }
        }}
      />
      {query !== null && matches.length > 0 && (
        <ul role="listbox" aria-label="Mention a teammate" data-testid="mention-list" className="absolute z-50 left-0 right-0 bottom-full mb-1 max-h-56 overflow-auto rounded-xl border bg-white dark:bg-card shadow-lg p-1">
          {matches.map((m, i) => (
            <li key={m.id} role="option" aria-selected={i === active}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(m.name)} className={cn("w-full text-left rounded-lg px-3 py-2 min-h-[44px] flex items-center justify-between gap-2", i === active ? "bg-primary/10" : "hover:bg-black/5 dark:hover:bg-white/10")}>
                <span className="text-sm font-medium truncate">{m.name}</span>
                {m.team && <span className="text-xs text-muted-foreground shrink-0">{m.team}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Comment text with "@Name" of real teammates highlighted. */
export function MentionText({ body }: { body: string }) {
  const { data: users = [] } = useUsers();
  const names = useMemo(() => (users as any[]).map(fullNameOf).filter(Boolean).sort((a, b) => b.length - a.length), [users]);
  const parts: (string | { mention: string })[] = [];
  let rest = body;
  while (rest.length) {
    const at = rest.indexOf("@");
    if (at === -1) { parts.push(rest); break; }
    const tail = rest.slice(at + 1);
    const hit = names.find((n) => tail.toLowerCase().startsWith(n.toLowerCase()));
    if (!hit) { parts.push(rest.slice(0, at + 1)); rest = tail; continue; }
    if (at > 0) parts.push(rest.slice(0, at));
    parts.push({ mention: "@" + tail.slice(0, hit.length) });
    rest = tail.slice(hit.length);
  }
  // whitespace-pre-wrap keeps the writer's line breaks and point lists as typed
  return <span className="whitespace-pre-wrap break-words">{parts.map((p, i) => (typeof p === "string" ? <span key={i}>{p}</span> : <span key={i} className="font-semibold text-primary">{p.mention}</span>))}</span>;
}
