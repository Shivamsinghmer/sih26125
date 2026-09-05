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
      <p className="text-body leading-body text-slate-gray">
        No assets minted yet — seed the demo or mint one first.
      </p>
    );
  }

  const firstAsset = assets[0];

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="flex flex-wrap items-end gap-4">
        <Field label="Asset">
          <Select name="tokenId" defaultValue={firstAsset?.tokenId}>
            {assets.map((asset) => (
              <option key={asset.tokenId} value={asset.tokenId}>
                #{asset.tokenId} — requires {asset.requiredRoleLabel}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Current holder">
          <Select name="from" defaultValue={firstAsset?.ownerId ?? personas[0]?.id}>
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Transfer to">
          <Select name="to" defaultValue={personas[personas.length - 1]?.id}>
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.roleLabel}
              </option>
            ))}
          </Select>
        </Field>

        <PillButton type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Attempt transfer"}
        </PillButton>
      </form>

      <ActionResultCard result={result} />
    </div>
  );
}
