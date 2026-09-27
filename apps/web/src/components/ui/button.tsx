import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Slot } from "radix-ui";

/**
 * The pill button, on Radix's primitive.
 *
 * shadcn's stock variants ship a 32px-high `rounded-lg` button, which is a
 * different design system's geometry. Steep's is a fully rounded lozenge at
 * body size — `docs/DESIGN.md` § "Pill Button" — so the geometry is replaced
 * here rather than overridden per call site.
 *
 * What is kept from the primitive is the part that is tedious and easy to get
 * wrong by hand: `focus-visible` rings that never fire on a mouse click,
 * `aria-invalid` wiring, icon sizing, `asChild` so a link can wear a button's
 * clothes without nesting an anchor in a button, and disabled semantics.
 */
const buttonVariants = cva(
  [
    "group/button inline-flex shrink-0 items-center justify-center gap-2",
    "rounded-full border bg-clip-padding whitespace-nowrap select-none",
    "font-sans transition-[background-color,color,border-color,opacity] duration-150 ease-out",
    // The ring is ink, not a browser blue, and it sits off the edge so it reads
    // against both the filled and the ghost variant.
    "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-40",
    "aria-invalid:border-destructive",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      variant: {
        /** Primary action. The solid ink lozenge. */
        filled:
          "border-transparent bg-primary text-primary-foreground hover:bg-[color-mix(in_oklab,var(--primary),white_12%)] active:bg-[color-mix(in_oklab,var(--primary),white_4%)]",
        /** Secondary, paired with filled on the same row. */
        ghost:
          "border-primary bg-transparent text-primary hover:bg-secondary active:bg-[color-mix(in_oklab,var(--secondary),var(--primary)_6%)]",
        /** Lowest emphasis: no border until it is wanted. */
        quiet:
          "border-transparent bg-transparent text-foreground hover:bg-secondary active:bg-[color-mix(in_oklab,var(--secondary),var(--primary)_6%)]",
        /**
         * Refusal. Sienna on blush, never a red — DESIGN.md's one sanctioned
         * chromatic deviation is this pair, and importing a red would spend the
         * restraint the rest of the system is built on.
         */
        refusal:
          "border-transparent bg-blush-peach text-sienna-brown hover:bg-[color-mix(in_oklab,var(--color-blush-peach),var(--color-sienna-brown)_8%)]",
      },
      size: {
        /** Steep's body-size control: 17px text on a 48px pill. */
        default: "h-12 px-5 text-body",
        sm: "h-9 px-4 text-caption",
        lg: "h-14 px-7 text-body-lg",
        icon: "size-12",
        "icon-sm": "size-9",
      },
    },
    defaultVariants: {
      variant: "filled",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "filled",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
