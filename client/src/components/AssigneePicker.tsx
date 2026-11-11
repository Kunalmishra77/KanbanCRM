import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type PickerUser = { id: string; firstName?: string | null; lastName?: string | null; email?: string | null };

const nameOf = (u: PickerUser) => `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email || "Unnamed";

/** Assignee dropdown with a search box and a scrollable list. Value "unassigned" means nobody. */
export function AssigneePicker({
  users,
  value,
  onChange,
  className,
  testId,
}: {
  users: PickerUser[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = users.find((u) => u.id === value);
  const sorted = [...users].sort((a, b) => nameOf(a).localeCompare(nameOf(b)));

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          data-testid={testId}
          className={cn(
            "flex w-full items-center justify-between rounded-md border border-input px-3 text-sm text-left",
            className,
          )}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? nameOf(selected) : "Unassigned"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search name..." />
          <CommandList className="max-h-64 overflow-y-auto visible-scrollbar">
            <CommandEmpty>No one found.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="unassigned nobody" onSelect={() => pick("unassigned")}>
                <Check className={cn("mr-2 h-4 w-4", value === "unassigned" || !selected ? "opacity-100" : "opacity-0")} />
                Unassigned
              </CommandItem>
              {sorted.map((u) => (
                <CommandItem key={u.id} value={`${nameOf(u)} ${u.email ?? ""} ${u.id}`} onSelect={() => pick(u.id)}>
                  <Check className={cn("mr-2 h-4 w-4", value === u.id ? "opacity-100" : "opacity-0")} />
                  {nameOf(u)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
