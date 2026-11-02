"use client";

import { Check } from "lucide-react";
import { createContext, use, useMemo, useState } from "react";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ApiClientError } from "@/lib/api-client";

type UpgradeState = { open: (reason?: string) => void };

const UpgradeContext = createContext<UpgradeState | null>(null);

export function UpgradeProvider({ children }: { children: React.ReactNode }) {
  const [reason, setReason] = useState<string | null>(null);
  const value = useMemo<UpgradeState>(
    () => ({ open: (r) => setReason(r ?? "Search as much as your team needs.") }),
    [],
  );
  return (
    <UpgradeContext value={value}>
      {children}
      <Dialog open={reason !== null} onOpenChange={(open) => !open && setReason(null)}>
        <DialogContent title="Upgrade to Pro" description={reason}>
          <ul className="mt-5 space-y-2.5 text-sm">
            {[
              "Unlimited searches for everyone at your company",
              "Correct filters and re-run searches as often as you like",
              "Re-run saved searches any time",
            ].map((item) => (
              <li key={item} className="flex gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-accent" />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-5 rounded-2xl bg-subtle p-4 text-sm text-muted">
            <p className="font-medium text-ink">How to upgrade</p>
            <p className="mt-1">
              Your company admin subscribes through Stripe. As soon as the subscription is active,
              Pro switches on here automatically. There&apos;s nothing to install or reload.
            </p>
          </div>
          <DialogClose asChild>
            <Button variant="primary" className="mt-5 w-full">
              Got it
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </UpgradeContext>
  );
}

export function useUpgrade(): UpgradeState {
  const value = use(UpgradeContext);
  if (!value) throw new Error("useUpgrade must be used inside UpgradeProvider");
  return value;
}

export function isLimitError(error: unknown): boolean {
  return error instanceof ApiClientError && error.status === 402;
}
