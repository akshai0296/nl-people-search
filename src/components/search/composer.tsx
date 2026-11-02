"use client";

import { ArrowUp } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { Spinner } from "@/components/ui/misc";
import { cn } from "@/lib/format";

const MAX_LENGTH = 500;

/** The brief input. Enter searches, Shift+Enter adds a line. */
export function Composer({
  initialValue = "",
  pending,
  autoFocus,
  onSubmit,
  footer,
}: {
  initialValue?: string;
  pending: boolean;
  autoFocus?: boolean;
  onSubmit: (brief: string) => void;
  footer?: React.ReactNode;
}) {
  const [value, setValue] = useState(initialValue);
  const ref = useRef<HTMLTextAreaElement>(null);

  // Grow with the text, up to a few lines.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const brief = value.trim();
  const submit = () => {
    if (brief && !pending) onSubmit(brief);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="rounded-2xl border border-border bg-surface shadow-card transition focus-within:border-border-strong focus-within:shadow-pop"
    >
      <label htmlFor="brief" className="sr-only">
        Describe who you&apos;re looking for
      </label>
      <textarea
        id="brief"
        ref={ref}
        rows={1}
        value={value}
        autoFocus={autoFocus}
        maxLength={MAX_LENGTH}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Senior React engineers in New York who have worked at a startup"
        className="block w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[15px] leading-6 outline-none placeholder:text-faint sm:text-base"
      />
      <div className="flex items-center justify-between gap-3 px-3 pb-3 pl-4">
        <div className="min-w-0 text-xs text-faint">
          {value.length > MAX_LENGTH - 100 ? `${value.length}/${MAX_LENGTH}` : footer}
        </div>
        <button
          type="submit"
          disabled={!brief || pending}
          aria-label="Search"
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl transition",
            brief && !pending ? "bg-primary text-on-primary hover:opacity-90" : "bg-subtle text-faint",
          )}
        >
          {pending ? <Spinner /> : <ArrowUp className="size-4" strokeWidth={2.5} />}
        </button>
      </div>
    </form>
  );
}
