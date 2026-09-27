import type { ReactNode } from "react";

/**
 * One heading treatment across every dashboard page, so they read as one app.
 *
 * The serif stays: Steep's signature is the regular-weight serif at heading
 * size, and a console page title is where that voice belongs. What changed is
 * the frame around it — an `actions` slot, so a page's primary action sits on
 * the heading's baseline instead of floating somewhere in the body, and a
 * hairline that ends the header so the content below starts on a clear edge.
 */
export function PageHeading({
  title,
  children,
  actions,
}: {
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-10 border-b border-border pb-8">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <h1 className="display-serif text-[clamp(34px,3.6vw,44px)] leading-[1.12] tracking-[-0.018em] text-balance">
          {title}
        </h1>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
      {children ? (
        <p className="mt-4 max-w-[64ch] text-body-lg leading-[1.5] text-pretty text-subtle">
          {children}
        </p>
      ) : null}
    </header>
  );
}
