"use client";

import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/format";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

/** A centred dialog on larger screens, a bottom sheet on phones. */
export function DialogContent({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] animate-fade-in" />
      <D.Content
        className={cn(
          "fixed z-50 bg-surface shadow-pop outline-none animate-fade-in",
          "inset-x-0 bottom-0 rounded-t-3xl border-t border-border p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]",
          "sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-[min(440px,calc(100vw-32px))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border sm:pb-6",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <D.Title className="text-lg font-semibold tracking-tight">{title}</D.Title>
          <D.Close className="-mt-1 -mr-2 rounded-lg p-1.5 text-faint hover:bg-hover hover:text-ink" aria-label="Close">
            <X className="size-4" />
          </D.Close>
        </div>
        {description ? (
          <D.Description className="mt-1.5 text-sm text-muted">{description}</D.Description>
        ) : (
          <D.Description className="sr-only">{title}</D.Description>
        )}
        {children}
      </D.Content>
    </D.Portal>
  );
}
