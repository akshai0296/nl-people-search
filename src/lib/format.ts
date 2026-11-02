import { twMerge } from "tailwind-merge";

/** Joins class names; later Tailwind classes override conflicting earlier ones. */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return twMerge(classes.filter(Boolean).join(" "));
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString()} ${n === 1 ? one : many}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export function location(loc: { city: string; state: string | null }): string {
  return loc.state ? `${loc.city}, ${loc.state}` : loc.city;
}

/** "2022 – Present · 4 yrs" */
export function tenure(start: number, end: number | null): string {
  const to = end ?? new Date().getFullYear();
  const years = Math.max(to - start, 0);
  const span = years === 0 ? "Less than a year" : `${years} yr${years === 1 ? "" : "s"}`;
  return `${start} – ${end ?? "Present"} · ${span}`;
}

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function timeAgo(iso: string): string {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return "just now";
}
