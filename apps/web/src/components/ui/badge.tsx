import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Slot } from "radix-ui";

/**
 * Clearance levels, statuses and category tags.
 *
 * Steep specifies two different things that both look like badges, and they are
 * kept apart here because conflating them is what turns a page into confetti:
 *
 *   - **tag** is the typographic category label — no background, no border, no
 *     badge at all. DESIGN.md: "Intentionally ghost-like — these are
 *     typographic tags, not badges. They group without visual weight."
 *   - everything else is a real chip, for state that a reader must be able to
 *     spot without reading: a clearance level, a valid/revoked/expired verdict.
 *
 * `refusal` is sienna on blush rather than a red, for the reason recorded in
 * globals.css: the system's only chromatic pair already reads as a warning, and
 * a red would be a second one.
 */
const badgeVariants = cva(
  [
    "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1.5",
    "rounded-full border whitespace-nowrap",
    "font-sans text-[13px] leading-none font-[480]",
    "transition-colors duration-150",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
    "[&>svg]:pointer-events-none [&>svg]:size-3.5",
  ].join(" "),
  {
    variants: {
      variant: {
        /** Filled ink — the highest-emphasis chip; use sparingly. */
        ink: "border-transparent bg-primary text-primary-foreground",
        /** The default chip: quiet fill, readable label. */
        neutral: "border-transparent bg-mist-gray text-foreground",
        /** Hairline chip, for when a fill would be too much weight. */
        outline: "border-border bg-transparent text-foreground",
        /** Refusal / revoked / expired. Sienna on blush, never red. */
        refusal: "border-transparent bg-blush-peach text-sienna-brown",
        /** Valid / in force. Carries a fill so it is not read as absence. */
        valid: "border-border bg-paper-white text-foreground",
        /** The typographic tag — not a chip at all. */
        tag: "border-transparent bg-transparent px-0 text-label",
      },
      size: {
        default: "h-7 px-3",
        sm: "h-6 px-2.5 text-[12px]",
      },
    },
    defaultVariants: {
      variant: "neutral",
      size: "default",
    },
  },
);

function Badge({
  className,
  variant = "neutral",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
