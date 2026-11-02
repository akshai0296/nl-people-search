"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Logo } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";

export function LoginForm() {
  const { session, signIn } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (session) router.replace("/");
  }, [session, router]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    const message = await signIn(String(form.get("email")), String(form.get("password")));
    setPending(false);
    if (message) setError(message);
  }

  const field =
    "mt-1.5 h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-[15px] outline-none transition placeholder:text-faint focus:border-accent focus:ring-3 focus:ring-accent/15";

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm animate-fade-in">
        <Logo />
        <h1 className="mt-8 text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1.5 text-sm text-muted">Find the right people by describing them.</p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block text-sm font-medium">
            Work email
            <input name="email" type="email" required autoComplete="email" autoFocus className={field} placeholder="you@company.com" />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input name="password" type="password" required autoComplete="current-password" className={field} />
          </label>
          {error && (
            <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
              {error}
            </p>
          )}
          <Button type="submit" variant="primary" className="h-11 w-full" disabled={pending}>
            {pending && <Spinner />} Sign in
          </Button>
        </form>
      </div>
    </main>
  );
}
