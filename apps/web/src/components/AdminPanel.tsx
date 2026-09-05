"use client";

import { useActionState } from "react";

import { IDLE } from "@/lib/action-types";
import {
  grantRoleAction,
  mintAssetAction,
  revokeRoleAction,
} from "@/lib/actions";
import { ActionResultCard } from "./ActionResultCard";
import { Field, PillButton, Select } from "./ui";
import type { PersonaOption } from "./TransferPanel";

const ROLE_OPTIONS = [
  { value: 4, label: "Admin" },
  { value: 3, label: "Manager" },
  { value: 2, label: "Auditor" },
  { value: 1, label: "User" },
];

function PersonaRoleForm({
  personas,
  action,
  submitLabel,
  pendingLabel,
  showDuration = false,
}: {
  personas: PersonaOption[];
  action: typeof grantRoleAction;
  submitLabel: string;
  pendingLabel: string;
  showDuration?: boolean;
}) {
  const [result, formAction, pending] = useActionState(action, IDLE);

  return (
    <div className="flex flex-col gap-5">
      <form action={formAction} className="flex flex-wrap items-end gap-4">
        <Field label="Person">
          <Select name="persona" defaultValue={personas[1]?.id}>
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Role">
          <Select name="role" defaultValue={3}>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </Field>

        {showDuration ? (
          <Field label="Valid for">
            <Select name="days" defaultValue={30}>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
              <option value={365}>1 year</option>
            </Select>
          </Field>
        ) : null}

        <PillButton type="submit" variant="ghost" disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </PillButton>
      </form>

      <ActionResultCard result={result} />
    </div>
  );
}

export function AdminPanel({ personas }: { personas: PersonaOption[] }) {
  return (
    <div className="grid gap-10 md:grid-cols-2">
      <div>
        <h3 className="text-subheading leading-subheading">Issue a credential</h3>
        <p className="mt-1 text-caption leading-caption text-slate-gray">
          Writes the grant and its expiry to RoleRegistry.
        </p>
        <div className="mt-5">
          <PersonaRoleForm
            personas={personas}
            action={grantRoleAction}
            submitLabel="Issue credential"
            pendingLabel="Issuing…"
            showDuration
          />
        </div>
      </div>

      <div>
        <h3 className="text-subheading leading-subheading">Revoke a credential</h3>
        <p className="mt-1 text-caption leading-caption text-slate-gray">
          One transaction. Every verifier sees it on their next check.
        </p>
        <div className="mt-5">
          <PersonaRoleForm
            personas={personas}
            action={revokeRoleAction}
            submitLabel="Revoke credential"
            pendingLabel="Revoking…"
          />
        </div>
      </div>

      <div>
        <h3 className="text-subheading leading-subheading">Mint an asset</h3>
        <p className="mt-1 text-caption leading-caption text-slate-gray">
          Only an account holding the Issuer role can mint. The chosen role is what
          any future holder must present.
        </p>
        <div className="mt-5">
          <PersonaRoleForm
            personas={personas}
            action={mintAssetAction}
            submitLabel="Mint asset"
            pendingLabel="Minting…"
          />
        </div>
      </div>
    </div>
  );
}
