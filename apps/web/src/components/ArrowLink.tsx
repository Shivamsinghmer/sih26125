import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Steep's "Text Link with Arrow".
 *
 * DESIGN.md is specific on two points the console had drifted from: the arrow
 * is part of the label rather than a separate icon, and the link is **not**
 * underlined at rest — "the arrow suffix (→) carries the link affordance;
 * underlines appear only on hover". Every "See the history →" in the app was
 * underlined permanently, which made a row of them read as a paragraph of
 * errata. This is the one definition they all use now.
 *
 * The arrow nudges on hover. It is the only motion a link gets.
 */
export function ArrowLink({
  className,
  children,
  size = "caption",
  ...props
}: ComponentProps<typeof Link> & { size?: "caption" | "body" }) {
  return (
    <Link
      className={cn(
        "group/arrow inline-flex shrink-0 items-baseline gap-1.5 whitespace-nowrap text-ink-black",
        "decoration-1 hover:underline",
        size === "caption" ? "text-caption leading-caption" : "text-body leading-body",
        className,
      )}
      {...props}
    >
      <span>{children}</span>
      <span
        aria-hidden
        className="inline-block transition-transform duration-200 ease-out group-hover/arrow:translate-x-0.5 motion-reduce:transition-none"
      >
        →
      </span>
    </Link>
  );
}
