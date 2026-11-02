"use client";

import { ChevronLeft, Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FILTER_GROUPS, chipText, clearGroup, isActive, type FilterGroup } from "@/lib/filter-groups";
import { sameFilters, type Filters, type Vocabulary } from "@/lib/filters";
import { cn } from "@/lib/format";

type Props = {
  filters: Filters;
  vocab: Vocabulary | undefined;
  pending: boolean;
  /** Footer hint in the editors, e.g. that applying uses a search. */
  costHint?: string;
  onApply: (next: Filters) => void;
};

/**
 * The filters the app understood, as chips. Click a chip to edit it, × to remove it, or add a
 * new one. Every change is applied as a new search with the same brief.
 */
export function FilterBar({ filters, vocab, pending, costHint, onApply }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const active = FILTER_GROUPS.filter((g) => isActive(g, filters));

  const apply = (next: Filters) => {
    setOpen(null);
    onApply(next);
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", pending && "pointer-events-none opacity-60")}>
      {active.map((group) => {
        const { prefix, value } = chipText(group, filters);
        return (
          <Popover key={group.id} open={open === group.id} onOpenChange={(o) => setOpen(o ? group.id : null)}>
            <span className="inline-flex max-w-full items-center rounded-full border border-border bg-surface text-sm shadow-card transition hover:border-border-strong">
              <PopoverTrigger className="flex min-w-0 items-center gap-1.5 rounded-l-full py-1.5 pr-1 pl-3 text-left" aria-label={`Edit ${group.title}`}>
                {prefix && <span className="shrink-0 text-muted">{prefix}</span>}
                <span className="truncate font-medium">{value}</span>
              </PopoverTrigger>
              <button
                onClick={() => apply(clearGroup(group, filters))}
                aria-label={`Remove ${group.title} filter`}
                className="mr-1 rounded-full p-1 text-faint transition hover:bg-hover hover:text-ink"
              >
                <X className="size-3.5" />
              </button>
            </span>
            <PopoverContent>
              {vocab && (
                <GroupEditor group={group} filters={filters} vocab={vocab} costHint={costHint} onCancel={() => setOpen(null)} onApply={apply} />
              )}
            </PopoverContent>
          </Popover>
        );
      })}
      <AddFilter filters={filters} vocab={vocab} costHint={costHint} open={open === "+"} setOpen={(o) => setOpen(o ? "+" : null)} onApply={apply} />
    </div>
  );
}

function AddFilter({ filters, vocab, costHint, open, setOpen, onApply }: {
  filters: Filters;
  vocab: Vocabulary | undefined;
  costHint?: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  onApply: (next: Filters) => void;
}) {
  const [group, setGroup] = useState<FilterGroup | null>(null);
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setGroup(null); }}>
      <PopoverTrigger className="inline-flex items-center gap-1 rounded-full border border-dashed border-border-strong px-3 py-1.5 text-sm text-muted transition hover:border-solid hover:bg-surface hover:text-ink">
        <Plus className="size-3.5" /> Add filter
      </PopoverTrigger>
      <PopoverContent>
        {group && vocab ? (
          <GroupEditor group={group} filters={filters} vocab={vocab} costHint={costHint} onCancel={() => setGroup(null)} onApply={onApply} backLabel="Filters" />
        ) : (
          <div className="p-1.5">
            <p className="px-2.5 pt-1.5 pb-1 text-xs font-medium text-faint">Add a filter</p>
            <ul className="max-h-80 overflow-y-auto">
              {FILTER_GROUPS.filter((g) => !isActive(g, filters)).map((g) => (
                <li key={g.id}>
                  <button onClick={() => setGroup(g)} className="w-full rounded-lg px-2.5 py-2 text-left text-sm hover:bg-hover">
                    {g.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function GroupEditor({ group, filters, vocab, costHint, onCancel, onApply, backLabel }: {
  group: FilterGroup;
  filters: Filters;
  vocab: Vocabulary;
  costHint?: string;
  onCancel: () => void;
  onApply: (next: Filters) => void;
  backLabel?: string;
}) {
  const [draft, setDraft] = useState<Filters>(filters);
  const changed = !sameFilters(draft, filters);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (changed) onApply(draft);
      }}
    >
      <div className="flex items-center gap-1 border-b border-border px-3 py-2.5">
        {backLabel && (
          <button type="button" onClick={onCancel} className="-ml-1 rounded-md p-0.5 text-faint hover:text-ink" aria-label={`Back to ${backLabel}`}>
            <ChevronLeft className="size-4" />
          </button>
        )}
        <p className="text-sm font-medium">{group.title}</p>
      </div>
      {group.kind === "list" && <ListEditor group={group} draft={draft} setDraft={setDraft} vocab={vocab} />}
      {group.kind === "range" && <RangeEditor group={group} draft={draft} setDraft={setDraft} vocab={vocab} />}
      {group.kind === "boolean" && <BooleanEditor draft={draft} setDraft={setDraft} />}
      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2.5">
        <span className="text-xs text-faint">{costHint}</span>
        <div className="flex gap-1.5">
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" size="sm" variant="primary" disabled={!changed}>
            Apply
          </Button>
        </div>
      </div>
    </form>
  );
}

type EditorProps<G> = { group: G; draft: Filters; setDraft: (f: Filters) => void; vocab: Vocabulary };

function ListEditor({ group, draft, setDraft, vocab }: EditorProps<Extract<FilterGroup, { kind: "list" }>>) {
  // What's already selected comes first, so it's visible without scrolling. The order is fixed
  // when the editor opens so options don't jump around while being ticked.
  const [initiallySelected] = useState(() => new Set(draft[group.id]));
  const options = useMemo(
    () =>
      [...group.options(vocab)].sort(
        (a, b) => Number(initiallySelected.has(b.value)) - Number(initiallySelected.has(a.value)),
      ),
    [group, vocab, initiallySelected],
  );
  const [query, setQuery] = useState("");
  const selected = new Set(draft[group.id]);
  const visible = options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()));

  const toggle = (value: string) => {
    const next = selected.has(value) ? draft[group.id].filter((v) => v !== value) : [...draft[group.id], value];
    setDraft({ ...draft, [group.id]: next });
  };

  return (
    <div>
      {options.length > 10 && (
        <div className="relative px-3 pt-2.5">
          <Search className="absolute top-1/2 left-5.5 mt-1 size-3.5 -translate-y-1/2 text-faint" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            aria-label={`Search ${group.title}`}
            className="h-8 w-full rounded-lg bg-subtle pr-2.5 pl-8 text-sm outline-none placeholder:text-faint focus:ring-2 focus:ring-accent/40"
          />
        </div>
      )}
      <ul className="max-h-64 overflow-y-auto p-1.5">
        {visible.map((o) => (
          <li key={o.value}>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm hover:bg-hover">
              <input type="checkbox" checked={selected.has(o.value)} onChange={() => toggle(o.value)} className="size-4 accent-[var(--accent)]" />
              {o.label}
            </label>
          </li>
        ))}
        {visible.length === 0 && <li className="px-2.5 py-3 text-sm text-faint">No matches</li>}
      </ul>
    </div>
  );
}

function RangeEditor({ group, draft, setDraft, vocab }: EditorProps<Extract<FilterGroup, { kind: "range" }>>) {
  const bounds = group.bounds(vocab);
  const field = (key: typeof group.min | typeof group.max, label: string) => (
    <label className="flex-1 text-xs text-muted">
      {label}
      <input
        type="number"
        inputMode="numeric"
        min={bounds.min}
        max={bounds.max}
        value={draft[key] ?? ""}
        placeholder={String(key === group.min ? bounds.min : bounds.max)}
        onChange={(e) => {
          const n = Number(e.target.value);
          setDraft({ ...draft, [key]: e.target.value === "" || !Number.isFinite(n) ? null : Math.max(0, Math.round(n)) });
        }}
        className="mt-1 h-9 w-full rounded-lg bg-subtle px-2.5 text-sm text-ink tabular-nums outline-none placeholder:text-faint focus:ring-2 focus:ring-accent/40"
      />
    </label>
  );
  return (
    <div className="flex gap-3 p-3">
      {field(group.min, "At least")}
      {field(group.max, "At most")}
    </div>
  );
}

function BooleanEditor({ draft, setDraft }: { draft: Filters; setDraft: (f: Filters) => void }) {
  const options: { label: string; value: boolean | null }[] = [
    { label: "Open to work", value: true },
    { label: "Not open to work", value: false },
    { label: "Either", value: null },
  ];
  return (
    <div className="p-1.5" role="radiogroup">
      {options.map((o) => (
        <label key={o.label} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm hover:bg-hover">
          <input type="radio" name="open_to_work" checked={draft.open_to_work === o.value} onChange={() => setDraft({ ...draft, open_to_work: o.value })} className="size-4 accent-[var(--accent)]" />
          {o.label}
        </label>
      ))}
    </div>
  );
}
