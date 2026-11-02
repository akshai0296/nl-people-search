"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Pill, Skeleton } from "@/components/ui/misc";
import { cn, location } from "@/lib/format";
import type { CandidateCard } from "@/lib/types";

const MAX_SKILLS = 5;

/** One person in a result list or shortlist. The whole card opens their profile. */
export function CandidateRow({
  person,
  highlightSkills = [],
  action,
}: {
  person: CandidateCard;
  /** Skills the search asked for: shown first and highlighted. */
  highlightSkills?: string[];
  /** Right-hand control, e.g. the shortlist button. */
  action?: React.ReactNode;
}) {
  const wanted = new Set(highlightSkills);
  const skills = [...person.skills].sort((a, b) => Number(wanted.has(b)) - Number(wanted.has(a)));
  const shown = skills.slice(0, MAX_SKILLS);
  const more = skills.length - shown.length;

  return (
    <li className="group relative rounded-2xl border border-border bg-surface p-4 shadow-card transition hover:border-border-strong sm:p-5">
      <Link
        href={`/people/${person.id}`}
        className="absolute inset-0 rounded-2xl"
        aria-label={`View ${person.full_name}`}
      />
      <div className="flex gap-3.5 sm:gap-4">
        <Avatar src={person.avatar_url} name={person.full_name} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-medium group-hover:underline group-hover:decoration-border-strong group-hover:underline-offset-4">
              {person.full_name}
            </h3>
            {person.open_to_work && <Pill tone="success">Open to work</Pill>}
          </div>
          <p className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 text-sm text-muted sm:flex-nowrap">
            <span className="sm:truncate">{person.current_title}</span>
            <span className="text-faint">·</span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Avatar src={person.current_company_logo_url} name={person.current_company} size={16} square className="ring-0" />
              <span className="truncate">{person.current_company}</span>
            </span>
          </p>
          <p className="mt-0.5 text-sm text-faint">
            {location(person.location)} · {person.years_experience} yr{person.years_experience === 1 ? "" : "s"} experience
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {shown.map((skill) => (
              <span
                key={skill}
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-xs",
                  wanted.has(skill) ? "bg-accent-soft font-medium text-accent-ink" : "bg-subtle text-muted",
                )}
              >
                {skill}
              </span>
            ))}
            {more > 0 && <span className="px-1 py-0.5 text-xs text-faint">+{more}</span>}
          </div>
        </div>
        {action && <div className="relative z-10 shrink-0 self-start">{action}</div>}
      </div>
    </li>
  );
}

export function CandidateRowSkeleton() {
  return (
    <li className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex gap-4">
        <Skeleton className="size-12 rounded-full" />
        <div className="flex-1 space-y-2.5 pt-0.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3.5 w-64 max-w-full" />
          <Skeleton className="h-3.5 w-48" />
          <div className="flex gap-1.5 pt-1.5">
            <Skeleton className="h-5 w-14" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-12" />
          </div>
        </div>
      </div>
    </li>
  );
}
