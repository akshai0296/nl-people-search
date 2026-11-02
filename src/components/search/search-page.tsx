"use client";

import { Bookmark, BookmarkCheck, SearchX, TriangleAlert, UserSearch } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CandidateRow, CandidateRowSkeleton } from "@/components/candidate-row";
import { ShortlistButton } from "@/components/shortlist-button";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, Spinner } from "@/components/ui/misc";
import { isLimitError, useUpgrade } from "@/components/upgrade";
import { ApiClientError, errorMessage } from "@/lib/api-client";
import { hasAnyFilter, sameFilters, type Filters } from "@/lib/filters";
import { plural } from "@/lib/format";
import { useFacets, usePlan, useRunSearch, useSavedBriefs, useSaveBrief, useSearchResults } from "@/lib/queries";
import type { SearchPage as Page } from "@/lib/types";
import { Composer } from "./composer";
import { FilterBar } from "./filter-bar";

const EXAMPLES = [
  "Senior React engineers in New York who have worked at a startup",
  "Data scientists with a PhD",
  "Backend engineers in Austin who know Go and Kubernetes",
  "Product designers in San Francisco who are open to work",
];

export function SearchPage() {
  const searchId = useSearchParams().get("search");
  const router = useRouter();
  const upgrade = useUpgrade();
  const { data: plan } = usePlan();
  const run = useRunSearch();
  const results = useSearchResults(searchId);
  const current = results.data?.pages[0];

  const outOfSearches = plan?.plan === "free" && plan.searches_remaining === 0;
  const costHint = plan?.plan === "free" ? "Uses a search" : undefined;

  function search(input: { brief: string; filters?: Filters }) {
    if (outOfSearches) {
      upgrade.open(
        input.filters
          ? "Changing filters runs a new search, and you've used your free one. Upgrade to keep refining."
          : "You've used your free search. Upgrade to keep searching.",
      );
      return;
    }
    run.mutate(input, {
      onSuccess: (res) => router.push(`/?search=${res.search_id}`, { scroll: false }),
      onError: (error) => {
        if (isLimitError(error)) upgrade.open("You've used your free search. Upgrade to keep searching.");
      },
    });
  }

  const composer = (hero: boolean) => (
    <Composer
      key={current?.search_id ?? "new"}
      initialValue={hero ? "" : (current?.brief ?? "")}
      autoFocus={hero}
      pending={run.isPending}
      onSubmit={(brief) => search({ brief })}
      footer={<PlanHint />}
    />
  );

  // A search is running: show what's happening rather than a blank wait.
  if (run.isPending) {
    return (
      <div className="space-y-6">
        <Composer key="pending" initialValue={run.variables.brief} pending onSubmit={() => {}} />
        <SearchingState refining={!!run.variables.filters} />
      </div>
    );
  }

  const failed = run.isError && !isLimitError(run.error) ? run.error : null;

  if (!searchId) {
    return (
      <div className="mx-auto max-w-2xl pt-[6vh] sm:pt-[10vh]">
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight sm:text-4xl">Who are you looking for?</h1>
        <p className="mt-2 text-muted sm:text-lg">Describe them in plain English. You can adjust what we understood afterwards.</p>
        <div className="mt-6">{composer(true)}</div>
        {failed && <div className="mt-4"><ErrorState message={errorMessage(failed)} onRetry={() => search(run.variables!)} /></div>}
        <div className="mt-6">
          <p className="text-xs font-medium text-faint">Try</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                onClick={() => search({ brief: example })}
                className="rounded-full border border-border bg-surface px-3 py-1.5 text-left text-sm text-muted transition hover:border-border-strong hover:text-ink"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {composer(false)}
      {failed && <ErrorState message={errorMessage(failed)} onRetry={() => search(run.variables!)} />}
      {results.isError ? (
        results.error instanceof ApiClientError && results.error.status === 404 ? (
          <EmptyState icon={<SearchX />} title="This search isn't available" action={<Button asChild variant="secondary"><Link href="/">New search</Link></Button>}>
            It may belong to another workspace, or the link is wrong.
          </EmptyState>
        ) : (
          <ErrorState message={errorMessage(results.error)} onRetry={() => results.refetch()} />
        )
      ) : !current ? (
        <ResultsSkeleton />
      ) : (
        <Results
          pages={results.data!.pages}
          costHint={costHint}
          onRefine={(filters) => search({ brief: current.brief, filters })}
          hasNextPage={results.hasNextPage}
          loadingMore={results.isFetchingNextPage}
          loadMoreError={results.isFetchNextPageError}
          onLoadMore={() => results.fetchNextPage()}
        />
      )}
    </div>
  );
}

function PlanHint() {
  const { data: plan } = usePlan();
  if (plan?.plan !== "free") return null;
  const left = plan.searches_remaining ?? 0;
  return left > 0 ? (
    <span>Free plan: {left === 1 ? "this uses your one search" : `${left} searches left`}</span>
  ) : (
    <span className="text-warning">No free searches left</span>
  );
}

function SearchingState({ refining }: { refining: boolean }) {
  const [step, setStep] = useState(refining ? 1 : 0);
  useEffect(() => {
    const timer = setTimeout(() => setStep(1), 900);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div aria-live="polite">
      <p className="flex items-center gap-2 text-sm text-muted">
        <Spinner />
        {step === 0 ? "Reading your brief…" : "Finding matching people…"}
      </p>
      <ResultsSkeleton />
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <ul className="mt-4 space-y-3" aria-hidden>
      {Array.from({ length: 4 }, (_, i) => <CandidateRowSkeleton key={i} />)}
    </ul>
  );
}

function Results({ pages, costHint, onRefine, hasNextPage, loadingMore, loadMoreError, onLoadMore }: {
  pages: Page[];
  costHint?: string;
  onRefine: (filters: Filters) => void;
  hasNextPage: boolean;
  loadingMore: boolean;
  loadMoreError: boolean;
  onLoadMore: () => void;
}) {
  const first = pages[0]!;
  const { data: vocab } = useFacets();
  const people = pages.flatMap((p) => p.results);
  const highlight = [...first.filters.skills_all, ...first.filters.skills_any];
  const searchable = hasAnyFilter(first.filters);

  return (
    <>
      <section aria-labelledby="understood" className="space-y-2.5">
        <h2 id="understood" className="text-xs font-medium text-faint">
          {searchable ? "What we searched for · select a filter to change it" : "We couldn't find anything to search on"}
        </h2>
        <FilterBar
          filters={first.filters}
          vocab={vocab}
          pending={false}
          costHint={costHint}
          onApply={(next) => {
            if (!hasAnyFilter(next)) {
              toast("Keep at least one filter", { description: "A search with no filters would match everyone." });
              return;
            }
            onRefine(next);
          }}
        />
      </section>

      {first.unsupported.length > 0 && (
        <Unsupported page={first} onSearchWithout={searchable ? () => onRefine(first.filters) : undefined} />
      )}

      {first.unsupported.length === 0 && (
        <>
          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-sm text-muted" aria-live="polite">
              {first.total > 0 ? (
                <><span className="font-semibold text-ink tabular-nums">{plural(first.total, "person", "people")}</span> match, best first</>
              ) : null}
            </p>
            {searchable && <SaveSearch brief={first.brief} filters={first.filters} />}
          </div>

          {!searchable ? (
            <EmptyState icon={<UserSearch />} title="Tell us a bit more">
              Your brief didn&apos;t name anything we can search on. Try a role, skill, location, seniority, school or company.
            </EmptyState>
          ) : first.total === 0 ? (
            <EmptyState icon={<SearchX />} title="No one matches every filter">
              Try removing a filter above, or widen one, for example by adding another city.
            </EmptyState>
          ) : (
            <>
              <ul className="space-y-3">
                {people.map((person) => (
                  <CandidateRow
                    key={person.id}
                    person={person}
                    highlightSkills={highlight}
                    action={
                      <>
                        <span className="hidden sm:block"><ShortlistButton personId={person.id} personName={person.full_name.split(" ")[0]!} /></span>
                        <span className="sm:hidden"><ShortlistButton compact personId={person.id} personName={person.full_name.split(" ")[0]!} /></span>
                      </>
                    }
                  />
                ))}
              </ul>
              <div className="flex flex-col items-center gap-2 pt-2">
                <p className="text-xs text-faint tabular-nums">Showing {people.length} of {first.total}</p>
                {loadMoreError && <p className="text-sm text-danger">Couldn&apos;t load more people.</p>}
                {hasNextPage && (
                  <Button variant="secondary" onClick={onLoadMore} disabled={loadingMore}>
                    {loadingMore ? <Spinner /> : null} {loadMoreError ? "Try again" : "Show more"}
                  </Button>
                )}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}

function Unsupported({ page, onSearchWithout }: { page: Page; onSearchWithout?: () => void }) {
  return (
    <div role="status" className="rounded-2xl border border-warning/25 bg-warning-soft p-4 sm:p-5">
      <div className="flex gap-3">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-medium">We can&apos;t search on part of this brief, so we&apos;re not showing anyone</p>
          <p className="mt-1 text-muted">Showing people who don&apos;t meet it would be guessing.</p>
          <ul className="mt-3 space-y-1.5">
            {page.unsupported.map((u) => (
              <li key={u.phrase}>
                <span className="font-medium">&ldquo;{u.phrase}&rdquo;</span>
                <span className="text-muted"> · {u.reason}</span>
              </li>
            ))}
          </ul>
          {onSearchWithout && (
            <Button size="sm" variant="secondary" className="mt-4" onClick={onSearchWithout}>
              Search without {page.unsupported.length === 1 ? "it" : "them"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SaveSearch({ brief, filters }: { brief: string; filters: Filters }) {
  const { data: saved } = useSavedBriefs();
  const save = useSaveBrief();
  const router = useRouter();
  const isSaved = saved?.some((s) => s.brief === brief && sameFilters(s.filters, filters));

  if (isSaved) {
    return (
      <Button size="sm" variant="ghost" onClick={() => router.push("/saved")}>
        <BookmarkCheck className="text-accent" /> Saved
      </Button>
    );
  }
  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={save.isPending}
      onClick={() =>
        save.mutate(
          { brief, filters },
          {
            onSuccess: () => toast.success("Search saved", { action: { label: "View", onClick: () => router.push("/saved") } }),
            onError: (e) => toast.error("Couldn't save the search", { description: errorMessage(e) }),
          },
        )
      }
    >
      {save.isPending ? <Spinner /> : <Bookmark />} Save search
    </Button>
  );
}
