"use client";

import { useState } from "react";
import { cn, initials } from "@/lib/format";

/** A portrait or company logo, falling back to initials if the image can't load. */
export function Avatar({
  src,
  name,
  size = 40,
  square = false,
  className,
}: {
  src: string | null | undefined;
  name: string;
  size?: number;
  square?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const shape = square ? "rounded-[22%]" : "rounded-full";
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-subtle text-muted ring-1 ring-border",
        shape,
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.36) }}
    >
      {src && !failed ? (
        // Remote SVG illustrations: next/image would need SVG optimisation enabled for no gain.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        <span aria-hidden className="font-medium">
          {initials(name)}
        </span>
      )}
    </span>
  );
}
