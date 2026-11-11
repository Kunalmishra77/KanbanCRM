import { useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type PickerOption = { value: string; label: string; count?: number };

/** A compact "All clients ▾" style dropdown: search box, scrollable list, tick several. Empty selection = all. */
export function MultiPicker({
  allLabel,
  noun,
  options,
  selected,
  onChange,
  testId,
}: {
  allLabel: string;
  noun: string;
  options: PickerOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  const label =
    selected.length === 0
      ? allLabel
      : selected.length === 1
        ? options.find((o) => o.value === selected[0])?.label ?? `1 ${noun}`
        : `${selected.length} ${noun}s`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid={testId}
          className={cn(
            "flex h-9 max-w-[220px] items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors",
            selected.length > 0
              ? "border-primary/50 bg-primary/10 text-primary font-medium"
              : "border-border bg-white/50 dark:bg-white/[0.08] text-foreground hover:bg-muted/50",
          )}
        >
          <span className="truncate">{label}</span>
          {selected.length > 0 ? (
            <X
              className="h-3.5 w-3.5 shrink-0 opacity-70 hover:opacity-100"
              aria-label={`Clear ${noun} filter`}
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
            />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${noun}s...`} />
          <CommandList className="max-h-72 overflow-y-auto visible-scrollbar">
            <CommandEmpty>No {noun}s found.</CommandEmpty>
            <CommandGroup>
              <CommandItem value={`__all__ ${allLabel}`} onSelect={() => onChange([])}>
                <Check className={cn("mr-2 h-4 w-4", selected.length === 0 ? "opacity-100" : "opacity-0")} />
                {allLabel}
              </CommandItem>
              {options.map((o) => (
                <CommandItem key={o.value} value={`${o.label} ${o.value}`} onSelect={() => toggle(o.value)}>
                  <Check className={cn("mr-2 h-4 w-4", selected.includes(o.value) ? "opacity-100" : "opacity-0")} />
                  <span className="flex-1 truncate">{o.label}</span>
                  {o.count !== undefined && <span className="ml-2 text-xs text-muted-foreground">{o.count}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
