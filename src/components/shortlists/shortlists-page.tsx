"use client";

import { Plus, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, Skeleton, Spinner } from "@/components/ui/misc";
import { errorMessage } from "@/lib/api-client";
import { plural, timeAgo } from "@/lib/format";
import { useCreateShortlist, useShortlists } from "@/lib/queries";

export function ShortlistsPage() {
  const { data: lists, error, isLoading, refetch } = useShortlists();
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Shortlists</h1>
          <p className="mt-1 text-sm text-muted">Shared with everyone at your company.</p>
        </div>
        {!creating && (lists?.length ?? 0) > 0 && (
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Plus /> New list
          </Button>
        )}
      </div>

      {creating && <NewListForm onDone={() => setCreating(false)} />}

      <div className="mt-6">
        {error ? (
          <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        ) : lists!.length === 0 && !creating ? (
          <EmptyState
            icon={<Users />}
            title="No shortlists yet"
            action={<Button variant="primary" onClick={() => setCreating(true)}><Plus /> New list</Button>}
          >
            Create a list here, or press Shortlist on anyone in your search results.
          </EmptyState>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {lists!.map((list) => (
              <li key={list.id}>
                <Link
                  href={`/shortlists/${list.id}`}
                  className="flex h-full flex-col rounded-2xl border border-border bg-surface p-5 shadow-card transition hover:border-border-strong"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="truncate font-medium">{list.name}</h2>
                    <span className="shrink-0 text-xs text-faint">{timeAgo(list.updated_at)}</span>
                  </div>
                  <div className="mt-auto flex items-center gap-3 pt-5">
                    {list.preview.length > 0 && (
                      <div className="flex -space-x-2">
                        {list.preview.map((p) => (
                          <Avatar key={p.id} src={p.avatar_url} name={p.full_name} size={28} className="ring-2 ring-surface" />
                        ))}
                      </div>
                    )}
                    <span className="text-sm text-muted">{list.count === 0 ? "Empty" : plural(list.count, "person", "people")}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function NewListForm({ onDone }: { onDone: () => void }) {
  const create = useCreateShortlist();
  const router = useRouter();
  const [name, setName] = useState("");
  return (
    <form
      className="mt-6 flex gap-2 animate-fade-in"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        create.mutate(name.trim(), {
          onSuccess: (list) => router.push(`/shortlists/${list.id}`),
          onError: (err) => toast.error("Couldn't create the list", { description: errorMessage(err) }),
        });
      }}
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onDone()}
        maxLength={80}
        placeholder="List name, e.g. Frontend hires"
        aria-label="List name"
        className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-surface px-3.5 text-sm outline-none focus:border-accent focus:ring-3 focus:ring-accent/15"
      />
      <Button type="submit" variant="primary" disabled={!name.trim() || create.isPending}>
        {create.isPending && <Spinner />} Create
      </Button>
      <Button type="button" variant="ghost" onClick={onDone}>
        Cancel
      </Button>
    </form>
  );
}
