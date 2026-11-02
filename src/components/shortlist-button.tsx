"use client";

import { BookmarkCheck, BookmarkPlus, Check, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { errorMessage } from "@/lib/api-client";
import { cn } from "@/lib/format";
import { useCreateShortlist, useShortlists, useToggleShortlistMember } from "@/lib/queries";

/** "Shortlist" button: pick lists to add a person to, or create a new list on the spot. */
export function ShortlistButton({ personId, personName, compact = false }: {
  personId: string;
  personName: string;
  compact?: boolean;
}) {
  const { data: lists, isLoading } = useShortlists();
  const toggle = useToggleShortlistMember();
  const create = useCreateShortlist();
  const [name, setName] = useState("");

  const memberOf = lists?.filter((l) => l.person_ids.includes(personId)) ?? [];
  const label = memberOf.length === 0 ? "Shortlist" : memberOf.length === 1 ? memberOf[0]!.name : `${memberOf.length} lists`;

  function setMembership(shortlistId: string, listName: string, add: boolean) {
    toggle.mutate(
      { shortlistId, personId, add },
      { onError: (e) => toast.error(`Couldn't update ${listName}`, { description: errorMessage(e) }) },
    );
  }

  async function createAndAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const list = await create.mutateAsync(trimmed);
      setName("");
      setMembership(list.id, list.name, true);
      toast.success(`Added ${personName} to ${list.name}`);
    } catch (error) {
      toast.error("Couldn't create the list", { description: errorMessage(error) });
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size={compact ? "icon-sm" : "sm"}
          variant="secondary"
          aria-label={compact ? (memberOf.length ? `Shortlisted in ${label}` : "Add to shortlist") : undefined}
          className={cn(memberOf.length > 0 && "border-accent/30 bg-accent-soft text-accent-ink hover:bg-accent-soft", !compact && "max-w-44")}
        >
          {memberOf.length ? <BookmarkCheck /> : <BookmarkPlus />}
          {!compact && <span className="truncate">{label}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="p-1.5" onClick={(e) => e.stopPropagation()}>
        <p className="px-2.5 pt-1.5 pb-1 text-xs font-medium text-faint">Add {personName} to</p>
        {isLoading ? (
          <div className="flex justify-center py-4 text-muted"><Spinner /></div>
        ) : (
          <ul className="max-h-64 overflow-y-auto">
            {lists?.map((list) => {
              const checked = list.person_ids.includes(personId);
              return (
                <li key={list.id}>
                  <button
                    onClick={() => setMembership(list.id, list.name, !checked)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-hover"
                    role="menuitemcheckbox"
                    aria-checked={checked}
                  >
                    <span className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded border transition",
                      checked ? "border-accent bg-accent text-on-accent" : "border-border-strong",
                    )}>
                      {checked && <Check className="size-3" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{list.name}</span>
                    <span className="text-xs text-faint tabular-nums">{list.count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <form onSubmit={createAndAdd} className={cn("flex items-center gap-1.5 p-1", lists?.length ? "mt-1 border-t border-border pt-2" : "")}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder={lists?.length ? "New list" : "Name your first list"}
            aria-label="New list name"
            className="h-8 min-w-0 flex-1 rounded-lg bg-subtle px-2.5 text-sm outline-none placeholder:text-faint focus:ring-2 focus:ring-accent/40"
          />
          <Button type="submit" size="icon-sm" variant="primary" disabled={!name.trim() || create.isPending} aria-label="Create list and add">
            {create.isPending ? <Spinner /> : <Plus />}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
