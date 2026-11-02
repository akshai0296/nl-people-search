"use client";

import { ArrowLeft, Briefcase, GraduationCap, MapPin, UserX } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ShortlistButton } from "@/components/shortlist-button";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, Pill, Skeleton } from "@/components/ui/misc";
import { ApiClientError, errorMessage } from "@/lib/api-client";
import { location, tenure } from "@/lib/format";
import { usePerson } from "@/lib/queries";
import type { Candidate } from "@/lib/types";

export function CandidateProfile() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: person, error, isLoading, refetch } = usePerson(decodeURIComponent(id));

  const back = (
    <button
      onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
      className="-ml-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted transition hover:bg-hover hover:text-ink"
    >
      <ArrowLeft className="size-4" /> Back
    </button>
  );

  if (error instanceof ApiClientError && error.status === 404) {
    return (
      <EmptyState icon={<UserX />} title="Person not found" action={<Button asChild><Link href="/">Back to search</Link></Button>}>
        This profile doesn&apos;t exist or is no longer available.
      </EmptyState>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {back}
      {error ? (
        <div className="mt-4"><ErrorState message={errorMessage(error)} onRetry={() => refetch()} /></div>
      ) : isLoading || !person ? (
        <ProfileSkeleton />
      ) : (
        <Profile person={person} />
      )}
    </div>
  );
}

function Profile({ person }: { person: Candidate }) {
  const first = person.full_name.split(" ")[0]!;
  return (
    <article className="mt-4 animate-fade-in">
      <header className="rounded-3xl border border-border bg-surface p-5 shadow-card sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Avatar src={person.avatar_url} name={person.full_name} size={72} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{person.full_name}</h1>
              {person.open_to_work && <Pill tone="success">Open to work</Pill>}
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-muted">
              {person.current_title} at
              <Avatar src={person.current_company_logo_url} name={person.current_company} size={18} square className="ring-0" />
              <span className="font-medium text-ink">{person.current_company}</span>
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" /> {location(person.location)}</span>
              <span className="inline-flex items-center gap-1.5"><Briefcase className="size-3.5" /> {person.years_experience} years experience</span>
            </p>
          </div>
          <ShortlistButton personId={person.id} personName={first} />
        </div>
      </header>

      <Section title="Experience">
        <ol className="space-y-5">
          {person.experiences.map((e, i) => (
            <li key={i} className="flex gap-3.5">
              <Avatar src={e.company_logo_url} name={e.company} size={40} square />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{e.title}</p>
                <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
                  {e.company}
                  <Pill className="capitalize">{e.company_type}</Pill>
                </p>
                <p className="mt-0.5 text-sm text-faint">{tenure(e.start_year, e.end_year)}</p>
                {e.description && <p className="mt-2 text-sm text-muted">{e.description}</p>}
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Education">
        <ul className="space-y-4">
          {person.education.map((ed, i) => (
            <li key={i} className="flex gap-3.5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-[22%] bg-subtle text-muted ring-1 ring-border">
                <GraduationCap className="size-4" />
              </span>
              <div>
                <p className="font-medium">{ed.school}</p>
                <p className="text-sm text-muted">{ed.degree}, {ed.field}</p>
                {ed.graduation_year && <p className="text-sm text-faint">Graduated {ed.graduation_year}</p>}
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Skills">
        <div className="flex flex-wrap gap-2">
          {person.skills.map((skill) => (
            <span key={skill} className="rounded-lg bg-subtle px-2.5 py-1 text-sm text-ink">{skill}</span>
          ))}
        </div>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 rounded-3xl border border-border bg-surface p-5 shadow-card sm:p-7">
      <h2 className="mb-5 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mt-4 space-y-4" aria-hidden>
      <div className="rounded-3xl border border-border bg-surface p-7">
        <div className="flex gap-5">
          <Skeleton className="size-18 rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72 max-w-full" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
      </div>
      <div className="space-y-4 rounded-3xl border border-border bg-surface p-7">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}
