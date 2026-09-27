import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Steep's three card roles, as one component.
 *
 * `docs/DESIGN.md` names three distinct surfaces and the rules that separate
 * them, so they are variants here rather than three components or a pile of
 * per-call-site classes:
 *
 *   - **neutral** — mist gray, flat. The workhorse. No shadow, no border.
 *   - **elevated** — paper white with the floating-artifact shadow. The only
 *     surface in the system that earns elevation.
 *   - **accent** — blush peach with sienna ink. At most one per page.
 *
 * shadcn's stock card is a 12px-radius white panel with a hairline ring and
 * 14px text; all three of those belong to a different system. Steep's radius is
 * 24px, its body size is 17px, and a ring on a neutral card is explicitly a
 * Don't — "Don't apply drop shadows to content cards … only floating product
 * artifacts earn elevation".
 */
function Card({
  className,
  variant = "neutral",
  size = "default",
  ...props
}: React.ComponentProps<"div"> & {
  variant?: "neutral" | "elevated" | "accent";
  size?: "default" | "sm";
}) {
  return (
    <div
      data-slot="card"
      data-variant={variant}
      data-size={size}
      className={cn(
        "group/card flex flex-col gap-(--card-spacing) rounded-3xl py-(--card-spacing) text-body",
        "[--card-spacing:24px] data-[size=sm]:[--card-spacing:16px] data-[size=sm]:rounded-2xl",
        variant === "neutral" && "bg-mist-gray text-foreground",
        variant === "elevated" && "bg-paper-white text-foreground shadow-subtle-3",
        variant === "accent" && "bg-blush-peach text-sienna-brown",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min items-start gap-1.5 px-(--card-spacing)",
        "has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Sans, not serif, and deliberately. Steep's serif is for display sizes on
 * brand surfaces; a serif on a data card in an operations console is a display
 * face doing a label's job.
 */
function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-sans text-subheading leading-tight font-[480] text-balance",
        "group-data-[size=sm]/card:text-body-lg",
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn(
        "max-w-[60ch] text-caption leading-caption text-pretty",
        // On the peach surface, secondary text tints from its own hue rather
        // than dropping to gray, which would read as dirty against the warmth.
        "text-subtle group-data-[variant=accent]/card:text-sienna-brown/75",
        className,
      )}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card-content" className={cn("px-(--card-spacing)", className)} {...props} />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center gap-3 px-(--card-spacing) pt-(--card-spacing)",
        "border-t border-border/70 group-data-[variant=accent]/card:border-sienna-brown/15",
        className,
      )}
      {...props}
    />
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
