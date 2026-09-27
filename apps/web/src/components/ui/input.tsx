import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Text input at Steep's geometry: 16px radius, hairline border, body-size text
 * on paper white. `text-body` rather than shadcn's 14px because these forms are
 * filled in at a gate post and on a laptop mid-demo, not only at a desk.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-2xl border border-input bg-paper-white px-4 text-body",
        "transition-[border-color,box-shadow] duration-150 outline-none",
        "placeholder:text-smoke-gray",
        "file:mr-3 file:inline-flex file:h-8 file:rounded-full file:border-0 file:bg-mist-gray file:px-3 file:text-caption file:text-foreground",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/25",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
