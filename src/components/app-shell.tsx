"use client";

import { Bookmark, LogOut, Search, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import { useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { useUpgrade } from "@/components/upgrade";
import { Spinner } from "@/components/ui/misc";
import { cn, initials } from "@/lib/format";
import { useMe, usePlan } from "@/lib/queries";

const NAV = [
  { href: "/", label: "Search", icon: Search, match: (p: string) => p === "/" || p.startsWith("/people") },
  { href: "/shortlists", label: "Shortlists", icon: Users, match: (p: string) => p.startsWith("/shortlists") },
  { href: "/saved", label: "Saved", icon: Bookmark, match: (p: string) => p.startsWith("/saved") },
];

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 font-semibold tracking-tight">
      <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-on-primary">
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" aria-hidden>
          <path d="M5 13V3h4a3 3 0 0 1 0 6H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      People Search
    </span>
  );
}

/** Signed-in chrome. Redirects to /login when there is no session. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (session === null) router.replace("/login");
  }, [session, router]);

  if (!session) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted">
        <Spinner className="size-5" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4 sm:px-6">
          <Link href="/" aria-label="People Search home">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV.map(({ href, label, match }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                  match(pathname) ? "bg-hover text-ink" : "text-muted hover:text-ink",
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <PlanBadge />
            <AccountMenu email={session.user.email ?? ""} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-6 pb-28 sm:px-6 sm:pt-10 sm:pb-16">{children}</main>

      {/* Phones: thumb-reachable tabs instead of the header links. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur-md pb-safe sm:hidden">
        <div className="grid grid-cols-3">
          {NAV.map(({ href, label, icon: Icon, match }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                match(pathname) ? "text-ink" : "text-faint",
              )}
            >
              <Icon className="size-5" strokeWidth={match(pathname) ? 2.25 : 1.75} />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

function PlanBadge() {
  const { data: plan } = usePlan();
  const upgrade = useUpgrade();
  if (!plan) return null;
  if (plan.plan === "paid") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-ink">
        <Sparkles className="size-3" /> Pro
      </span>
    );
  }
  const left = plan.searches_remaining ?? 0;
  return (
    <button
      onClick={() =>
        upgrade.open(
          left > 0
            ? `The free plan includes ${left === 1 ? "one search" : `${left} searches`}. Upgrade for unlimited searching.`
            : "You've used your free search. Upgrade to keep searching.",
        )
      }
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition",
        left > 0
          ? "border-border bg-surface text-muted hover:text-ink"
          : "border-warning/30 bg-warning-soft text-warning",
      )}
    >
      <span className="hidden sm:inline">Free plan ·</span>
      {left > 0 ? `${left} search${left === 1 ? "" : "es"} left` : "No searches left"}
      <span className="font-semibold text-accent">Upgrade</span>
    </button>
  );
}

function AccountMenu({ email }: { email: string }) {
  const { signOut } = useAuth();
  const { data: me } = useMe();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label="Account"
        className="flex size-8 items-center justify-center rounded-full bg-subtle text-xs font-semibold text-muted ring-1 ring-border transition hover:text-ink"
      >
        {initials(me?.full_name ?? email)}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-56 rounded-2xl border border-border bg-surface p-1.5 shadow-pop animate-fade-in"
        >
          <div className="px-2.5 py-2">
            <p className="text-sm font-medium">{me?.full_name ?? email}</p>
            <p className="truncate text-xs text-muted">
              {me ? `${me.company.name} · ` : ""}
              {email}
            </p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item
            onSelect={() => void signOut()}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted outline-none data-highlighted:bg-hover data-highlighted:text-ink"
          >
            <LogOut className="size-4" /> Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
