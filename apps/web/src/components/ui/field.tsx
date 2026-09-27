import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A labelled form control.
 *
 * The root is a `<label>` that wraps its control, so the association holds by
 * nesting with no `id` to keep in sync — which is what keeps
 * `page.getByLabel("Area")` working in the e2e suite and, more to the point,
 * what lets a screen reader announce every field. (A sibling label with no
 * `htmlFor` looks identical and is associated with nothing.)
 */
function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  /** Optional helper line under the control. */
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label data-slot="field" className={cn("group flex min-w-0 flex-col gap-2", className)}>
      <span className="text-caption leading-caption font-[480] text-label">{label}</span>
      {children}
      {hint ? <span className="text-caption leading-caption text-subtle">{hint}</span> : null}
    </label>
  );
}

/**
 * The native select, styled — deliberately not Radix's.
 *
 * A native `<select>` is the right control here and not a compromise. It needs
 * no JavaScript, it uses the platform's own picker on a touch device (which is
 * what a gate post is), it is keyboard- and screen-reader-correct for free, and
 * it submits inside a plain form post to a server action. Radix's Select would
 * trade all of that for a stylable listbox that this product does not need.
 *
 * Only the two things the browser gets wrong are replaced: the chevron (drawn,
 * in the system's own stroke weight, rather than the platform's) and the
 * focus ring.
 */
function Select({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        data-slot="select"
        className={cn(
          "h-12 w-full appearance-none rounded-2xl border border-input bg-paper-white pl-4 pr-11 text-body",
          "transition-[border-color,box-shadow] duration-150 outline-none",
          "hover:border-[color-mix(in_oklab,var(--input),var(--foreground)_18%)]",
          "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 18 18"
        className="pointer-events-none absolute top-1/2 right-4 size-[18px] -translate-y-1/2 text-label"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4.5 7.25 9 11.5l4.5-4.25" />
      </svg>
    </div>
  );
}

export { Field, Select };
