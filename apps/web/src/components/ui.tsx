import type { ReactNode } from "react";

export function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-20">
      <p className="text-caption leading-caption text-ash-gray">{eyebrow}</p>
      <h2 className="display-serif mt-2 text-heading leading-heading tracking-heading">
        {title}
      </h2>
      <div className="mt-8">{children}</div>
    </section>
  );
}

export function Card({
  children,
  accent = false,
  testId,
}: {
  children: ReactNode;
  accent?: boolean;
  /** Lets a test target the whole card rather than guessing at a nested div. */
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      className={`rounded-3xl px-6 py-6 ${accent ? "bg-blush-peach" : "bg-mist-gray"}`}
    >
      {children}
    </div>
  );
}

export function PillButton({
  children,
  variant = "filled",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "filled" | "ghost";
}) {
  const base =
    "rounded-full px-5 py-3 text-[16px] transition-opacity disabled:opacity-40";
  const styles =
    variant === "filled"
      ? "bg-ink-black text-paper-white hover:opacity-90"
      : "border border-ink-black text-ink-black hover:bg-mist-gray";
  return (
    <button className={`${base} ${styles}`} {...props}>
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-caption leading-caption text-slate-gray">{label}</span>
      {children}
    </label>
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className="rounded-2xl border border-mist-gray bg-paper-white px-4 py-3 text-body"
      {...props}
    />
  );
}
