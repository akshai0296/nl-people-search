"use client";

import { Popover as P } from "radix-ui";
import { cn } from "@/lib/format";

export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;
export const PopoverAnchor = P.Anchor;
export const PopoverClose = P.Close;

export function PopoverContent({
  className,
  align = "start",
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof P.Content>) {
  return (
    <P.Portal>
      <P.Content
        align={align}
        sideOffset={sideOffset}
        collisionPadding={12}
        className={cn(
          "z-50 w-72 max-w-[calc(100vw-24px)] rounded-2xl border border-border bg-surface shadow-pop outline-none animate-fade-in",
          className,
        )}
        {...props}
      />
    </P.Portal>
  );
}
