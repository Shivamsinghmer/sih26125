import { cn } from "@/lib/utils";

/**
 * Loading placeholder. Operate surfaces get skeletons rather than a spinner in
 * the middle of the content well, so the layout does not jump when data lands.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn("animate-pulse rounded-2xl bg-mist-gray", className)}
      {...props}
    />
  );
}

export { Skeleton };
