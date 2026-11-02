import { Slot } from "radix-ui";
import { cn } from "@/lib/format";

type Variant = "primary" | "secondary" | "ghost" | "accent" | "danger";
type Size = "sm" | "md" | "icon" | "icon-sm";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:opacity-90 shadow-card",
  accent: "bg-accent text-on-accent hover:opacity-90 shadow-card",
  secondary: "bg-surface text-ink border border-border hover:bg-subtle shadow-card",
  ghost: "text-muted hover:text-ink hover:bg-hover",
  danger: "bg-danger text-white hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  icon: "size-10 rounded-xl",
  "icon-sm": "size-8 rounded-lg",
};

export type ButtonProps = React.ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
};

export function Button({ variant = "secondary", size = "md", asChild, className, ...props }: ButtonProps) {
  const Component = asChild ? Slot.Root : "button";
  return (
    <Component
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition select-none",
        "disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
