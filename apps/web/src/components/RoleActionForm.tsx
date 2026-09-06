"use client";

import { useActionState } from "react";

import type { ActionResult } from "@/lib/action-types";
import { IDLE } from "@/lib/action-types";
import { ActionResultCard } from "./ActionResultCard";
import { Field, PillButton, Select } from "./ui";
import type { PersonaOption } from "./TransferPanel";

export const ROLE_OPTIONS = [
  { value: 4, label: "Admin" },
  { value: 3, label: "Manager" },
  { value: 2, label: "Auditor" },
  { value: 1, label: "User" },
];

type RoleAction = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

/**
 * The shared shape of every admin operation: pick a person, pick a role, act.
 * Issue, revoke and mint differ only in which action they post to and whether
 * an expiry applies, so they share one form rather than three near-copies.
 */
export function RoleActionForm({
  personas,
  action,
  submitLabel,
  pendingLabel,
  showDuration = false,
  variant = "filled",
}: {
  personas: PersonaOption[];
  action: RoleAction;
  submitLabel: string;
  pendingLabel: string;
  showDuration?: boolean;
  variant?: "filled" | "ghost";
}) {
  const [result, formAction, pending] = useActionState(action, IDLE);

  return (
    <div className="flex flex-col gap-5">
      <form action={formAction} className="flex flex-wrap items-end gap-4">
        <Field label="Person">
          <Select name="persona" defaultValue={personas[1]?.id ?? personas[0]?.id}>
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

        <PillButton type="submit" variant={variant} disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </PillButton>
      </form>

      <ActionResultCard result={result} />
    </div>
  );
}
