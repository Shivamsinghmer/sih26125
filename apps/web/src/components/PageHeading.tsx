import type { ReactNode } from "react";

/** One heading treatment across every dashboard page, so they read as one app. */
export function PageHeading({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-10">
      <h1 className="display-serif text-heading leading-heading tracking-heading">
        {title}
      </h1>
      {children ? (
        <p className="mt-3 max-w-[68ch] text-body-lg leading-body-lg text-label">
          {children}
        </p>
      ) : null}
    </header>
  );
}
