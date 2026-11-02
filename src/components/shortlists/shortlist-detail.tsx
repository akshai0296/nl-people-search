"use client";

import { ArrowLeft, Pencil, Trash2, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CandidateRow, CandidateRowSkeleton } from "@/components/candidate-row";
import { Button } from "@/components/ui/button";
import { Confirm } from "@/components/ui/confirm";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/misc";
import { ApiClientError, errorMessage } from "@/lib/api-client";
import { plural } from "@/lib/format";
import { useDeleteShortlist, useRenameShortlist, useShortlist, useToggleShortlistMember } from "@/lib/queries";

export function ShortlistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: list, error, isLoading, refetch } = useShortlist(id);
  const remove = useToggleShortlistMember();
  const del = useDeleteShortlist();

  const backLink = (
    <Link href="/shortlists" className="-ml-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted transition hover:bg-hover hover:text-ink">
      <ArrowLeft className="size-4" /> Shortlists
    </Link>
  );

  if (error instanceof ApiClientError && error.status === 404) {
    return (
      <EmptyState icon={<X />} title="Shortlist not found" action={<Button asChild><Link href="/shortlists">All shortlists</Link></Button>}>
        It may have been deleted.
      </EmptyState>
    );
  }

  return (
    <div>
      {backLink}
      {error ? (
        <div className="mt-4"><ErrorState message={errorMessage(error)} onRetry={() => refetch()} /></div>
      ) : isLoading || !list ? (
        <div className="mt-4 space-y-3" aria-hidden>
          <Skeleton className="h-8 w-56" />
          <ul className="space-y-3 pt-4">{[0, 1, 2].map((i) => <CandidateRowSkeleton key={i} />)}</ul>
        </div>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <ListName id={list.id} name={list.name} />
              <p className="mt-1 text-sm text-muted">{list.people.length === 0 ? "No one yet" : plural(list.people.length, "person", "people")}</p>
            </div>
            <Confirm
              trigger={<Button variant="ghost" size="sm"><Trash2 /> Delete list</Button>}
              title={`Delete “${list.name}”?`}
              description="The list is removed for everyone at your company. The people on it stay searchable."
              confirmLabel="Delete list"
              pending={del.isPending}
              onConfirm={() =>
                del.mutate(list.id, {
                  onSuccess: () => {
                    toast.success(`Deleted ${list.name}`);
                    router.replace("/shortlists");
                  },
                  onError: (e) => toast.error("Couldn't delete the list", { description: errorMessage(e) }),
                })
              }
            />
          </div>

          {list.people.length === 0 ? (
            <EmptyState icon={<UserPlus />} title="No one on this list yet" action={<Button asChild variant="primary"><Link href="/">Find people</Link></Button>}>
              Press Shortlist on anyone in your search results to add them here.
            </EmptyState>
          ) : (
            <ul className="mt-6 space-y-3">
              {list.people.map((person) => (
                <CandidateRow
                  key={person.id}
                  person={person}
                  action={
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Remove ${person.full_name} from ${list.name}`}
                      onClick={() =>
                        remove.mutate(
                          { shortlistId: list.id, personId: person.id, add: false },
                          {
                            onSuccess: () => toast(`Removed ${person.full_name}`),
                            onError: (e) => toast.error("Couldn't remove", { description: errorMessage(e) }),
                          },
                        )
                      }
                    >
                      <X /> <span className="hidden sm:inline">Remove</span>
                    </Button>
                  }
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function ListName({ id, name }: { id: string; name: string }) {
  const rename = useRenameShortlist(id);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);

  if (!editing) {
    return (
      <button onClick={() => { setValue(name); setEditing(true); }} className="group flex max-w-full items-center gap-2 text-left" aria-label={`Rename ${name}`}>
        <h1 className="truncate text-2xl font-semibold tracking-tight">{name}</h1>
        <Pencil className="size-4 shrink-0 text-faint transition group-hover:text-ink" />
      </button>
    );
  }

  const save = () => {
    const next = value.trim();
    if (!next || next === name) return setEditing(false);
    rename.mutate(next, {
      onSuccess: () => setEditing(false),
      onError: (e) => toast.error("Couldn't rename the list", { description: errorMessage(e) }),
    });
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }} className="flex gap-2">
      <input
        autoFocus
        value={value}
        maxLength={80}
        onChange={(e) => setValue(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
        onBlur={save}
        aria-label="List name"
        className="h-10 w-72 max-w-full rounded-xl border border-border bg-surface px-3 text-lg font-semibold outline-none focus:border-accent focus:ring-3 focus:ring-accent/15"
      />
    </form>
  );
}
