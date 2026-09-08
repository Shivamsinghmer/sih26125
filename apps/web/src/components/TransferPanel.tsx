"use client";

import { useActionState } from "react";

import { IDLE } from "@/lib/action-types";
import { attemptTransferAction } from "@/lib/actions";
import { ActionResultCard } from "./ActionResultCard";
import { Field, PillButton, Select } from "./ui";

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
      <form action={formAction} className="flex flex-wrap items-end gap-4">
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

        <Field label="Held by">
          <Select name="from" defaultValue={firstAsset?.ownerId ?? personas[0]?.id}>
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Hand it to">
          <Select name="to" defaultValue={personas[personas.length - 1]?.id}>
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.roleLabel}
              </option>
            ))}
          </Select>
        </Field>

        <PillButton type="submit" disabled={pending}>
          {pending ? "Checking…" : "Hand over"}
        </PillButton>
      </form>

      <ActionResultCard result={result} />
    </div>
  );
}
