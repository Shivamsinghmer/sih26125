"use client";

import { useActionState } from "react";

import { IDLE } from "@/lib/action-types";
import { mintAssetAction } from "@/lib/actions";
import { ActionResultCard } from "./ActionResultCard";
import { ROLE_OPTIONS } from "./RoleActionForm";
import type { PersonaOption } from "./TransferPanel";
import { Field, PillButton, Select } from "./ui";

/**
 * Adding a piece of equipment.
 *
 * This used to share RoleActionForm with giving and withdrawing clearance, on
 * the grounds that all three were "pick a person, pick a clearance, act". That
 * stopped being true once equipment gained an identity of its own: an item is a
 * particular physical object, and a register that cannot say *which*
 * oscilloscope is not an asset register.
 *
 * Name and serial are what the record is about. They stay in the operator's own
 * database — the token carries their digest, not the words — so the register
 * remains correctable while any later edit stops matching the token.
 */
export function MintPanel({ personas }: { personas: PersonaOption[] }) {
  const [result, formAction, pending] = useActionState(mintAssetAction, IDLE);

  return (
    <div className="flex flex-col gap-5">
      <form action={formAction} className="flex flex-wrap items-end gap-4">
        <Field label="Equipment">
          <input
            name="name"
            required
            maxLength={80}
            placeholder="Oscilloscope OS-2140"
            className="w-[240px] rounded-2xl border border-mist-gray bg-paper-white px-4 py-3 text-body placeholder:text-label"
          />
        </Field>

        <Field label="Serial number">
          <input
            name="serial"
            required
            maxLength={40}
            placeholder="OS2140-0007"
            className="w-[180px] rounded-2xl border border-mist-gray bg-paper-white px-4 py-3 text-body placeholder:text-label"
          />
        </Field>

        <Field label="First holder">
          <Select name="persona" defaultValue={personas[1]?.id ?? personas[0]?.id}>
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Clearance to hold it">
          <Select name="role" defaultValue={3}>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </Field>

        <PillButton type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add equipment"}
        </PillButton>
      </form>

      <ActionResultCard result={result} />
    </div>
  );
}
