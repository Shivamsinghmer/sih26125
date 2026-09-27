"use client";

import { useActionState } from "react";

import { IDLE } from "@/lib/action-types";
import { attemptTransferAction } from "@/lib/actions";
import { ActionResultCard } from "./ActionResultCard";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";

export interface PersonaOption {
  id: string;
  name: string;
  roleLabel: string;
}

export interface AssetOption {
  tokenId: string;
  /** What the item actually is. Absent for tokens minted before descriptions. */
  name?: string | null;
  serial?: string | null;
  ownerId: string | null;
  requiredRoleLabel: string;
}

export function TransferPanel({
  personas,
  assets,
}: {
  personas: PersonaOption[];
  assets: AssetOption[];
}) {
  const [result, formAction, pending] = useActionState(attemptTransferAction, IDLE);

  if (assets.length === 0) {
    return (
      <p className="text-body leading-body text-label">
        There is no equipment on the system yet. Add a piece on the Equipment
        page first, or load the example data from the People page.
      </p>
    );
  }

  const firstAsset = assets[0];

  return (
    <div className="flex flex-col gap-6">
      {/* Composed as the sentence it performs: this item, from this person,
          to that one. The direction is drawn between the two people rather
          than left for the labels to imply, because the whole point of the
          screen is which way the item is trying to go. */}
      <form
        action={formAction}
        className="rounded-3xl bg-mist-gray p-5 md:p-6"
      >
        <Field label="Item">
          <Select name="tokenId" defaultValue={firstAsset?.tokenId}>
            {assets.map((asset) => (
              <option key={asset.tokenId} value={asset.tokenId}>
                {asset.name
                  ? `${asset.name} (${asset.serial}) — needs ${asset.requiredRoleLabel} clearance`
                  : `Item #${asset.tokenId} — needs ${asset.requiredRoleLabel} clearance`}
              </option>
            ))}
          </Select>
        </Field>

        <div className="mt-5 grid items-end gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <Field label="Held by">
            <Select name="from" defaultValue={firstAsset?.ownerId ?? personas[0]?.id}>
              {personas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>

          <svg
            aria-hidden
            viewBox="0 0 32 18"
            className="mx-auto hidden h-12 w-8 text-label md:block"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 9h25" />
            <path d="m22.5 3.5 5.5 5.5-5.5 5.5" />
          </svg>

          <Field label="Hand it to">
            <Select name="to" defaultValue={personas[personas.length - 1]?.id}>
              {personas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.roleLabel}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
          <p className="max-w-[52ch] text-caption leading-caption text-subtle">
            The shared record checks the receiver&rsquo;s clearance when you
            press this. The screen does not decide.
          </p>
          <Button type="submit" disabled={pending}>
            {pending ? "Checking…" : "Hand over"}
          </Button>
        </div>
      </form>

      <ActionResultCard result={result} />
    </div>
  );
}
