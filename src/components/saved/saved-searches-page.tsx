"use client";

import { Bookmark, Play, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Confirm } from "@/components/ui/confirm";
import { EmptyState, ErrorState, Skeleton, Spinner } from "@/components/ui/misc";
import { isLimitError, useUpgrade } from "@/components/upgrade";
import { errorMessage } from "@/lib/api-client";
import { FILTER_GROUPS, chipText, isActive } from "@/lib/filter-groups";
import { EMPTY_FILTERS } from "@/lib/filters";
import { timeAgo } from "@/lib/format";
import { useDeleteSavedBrief, usePlan, useRunSearch, useSavedBriefs } from "@/lib/queries";
import type { SavedBrief } from "@/lib/types";

export function SavedSearchesPage() {
  const { data: saved, error, isLoading, refetch } = useSavedBriefs();
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Saved searches</h1>
      <p className="mt-1 text-sm text-muted">Re-run a search with the exact filters you saved.</p>
      <div className="mt-6">
        {error ? (
          <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
        ) : saved!.length === 0 ? (
          <EmptyState icon={<Bookmark />} title="No saved searches" action={<Button asChild variant="primary"><Link href="/">Search</Link></Button>}>
            Run a search, then press Save search to keep it here for later.
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {saved!.map((s) => <SavedRow key={s.id} saved={s} />)}
          </ul>
        )}
      </div>
    </div>
  );
}

function SavedRow({ saved }: { saved: SavedBrief }) {
  const router = useRouter();
  const upgrade = useUpgrade();
  const { data: plan } = usePlan();
  const run = useRunSearch();
  const del = useDeleteSavedBrief();
  const [confirming, setConfirming] = useState(false);
  const filters = { ...EMPTY_FILTERS, ...saved.filters };
  const chips = FILTER_GROUPS.filter((g) => isActive(g, filters)).map((g) => chipText(g, filters));

  function rerun() {
    if (plan?.plan === "free" && plan.searches_remaining === 0) {
      upgrade.open("Re-running a saved search is a new search, and you've used your free one.");
      return;
    }
    run.mutate(
      { brief: saved.brief, filters },
      {
        onSuccess: (res) => router.push(`/?search=${res.search_id}`),
        onError: (e) =>
          isLimitError(e)
            ? upgrade.open("You've used your free search. Upgrade to keep searching.")
            : toast.error("Couldn't run the search", { description: errorMessage(e) }),
      },
    );
  }

  return (
    <li className="rounded-2xl border border-border bg-surface p-4 shadow-card sm:p-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{saved.brief}</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {chips.map((c, i) => (
              <span key={i} className="rounded-full bg-subtle px-2.5 py-1 text-xs">
                {c.prefix && <span className="text-muted">{c.prefix} </span>}
                <span className="font-medium">{c.value}</span>
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-faint">Saved {timeAgo(saved.created_at)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Confirm
            open={confirming}
            onOpenChange={setConfirming}
            trigger={<Button size="icon-sm" variant="ghost" aria-label="Delete saved search"><Trash2 /></Button>}
            title="Delete this saved search?"
            description={`“${saved.brief}” will be removed for everyone at your company.`}
            confirmLabel="Delete"
            pending={del.isPending}
            onConfirm={() =>
              del.mutate(saved.id, {
                onSuccess: () => {
                  setConfirming(false);
                  toast("Saved search deleted");
                },
                onError: (e) => toast.error("Couldn't delete", { description: errorMessage(e) }),
              })
            }
          />
          <Button size="sm" variant="primary" onClick={rerun} disabled={run.isPending}>
            {run.isPending ? <Spinner /> : <Play />} Run
          </Button>
        </div>
      </div>
    </li>
  );
}
