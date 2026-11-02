import { AlertCircle, RotateCw } from "lucide-react";
import { cn } from "@/lib/format";
import { Button } from "./button";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("rounded-md bg-subtle animate-pulse-soft", className)} />;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("size-4 animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center animate-fade-in">
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-subtle text-muted [&_svg]:size-5">
        {icon}
      </div>
      <h2 className="font-semibold">{title}</h2>
      {children && <p className="mt-1.5 max-w-sm text-sm text-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-2xl border border-danger/25 bg-danger-soft p-4 text-sm">
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" />
      <div className="flex-1">
        <p className="font-medium">{message}</p>
      </div>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          <RotateCw /> Retry
        </Button>
      )}
    </div>
  );
}

export function Pill({ tone = "neutral", className, children }: {
  tone?: "neutral" | "accent" | "success" | "warning";
  className?: string;
  children: React.ReactNode;
}) {
  const tones = {
    neutral: "bg-subtle text-muted",
    accent: "bg-accent-soft text-accent-ink",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", tones[tone], className)}>
      {children}
    </span>
  );
}
