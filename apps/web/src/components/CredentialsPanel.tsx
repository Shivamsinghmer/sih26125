"use client";

import { grantRoleAction, revokeRoleAction } from "@/lib/actions";
import { FormSection } from "./FormSection";
import { RoleActionForm } from "./RoleActionForm";
import type { PersonaOption } from "./TransferPanel";

/**
 * Giving and taking away, as two operations rather than two columns. Side by
 * side they read as a choice between equals; stacked, each has its own
 * explanation beside it, and "take away" is visibly the second, quieter act.
 */
export function CredentialsPanel({ personas }: { personas: PersonaOption[] }) {
  return (
    <>
      <FormSection
        id="issue"
        flush
        title="Give a clearance"
        description={
          <>
            From the moment you press the button, this person can be handed
            equipment that needs this clearance &mdash; until the end date you
            choose.
          </>
        }
      >
        <RoleActionForm
          personas={personas}
          action={grantRoleAction}
          submitLabel="Give clearance"
          pendingLabel="Giving…"
          showDuration
        />
      </FormSection>

      <FormSection
        id="revoke"
        title="Take one away"
        description="Applies immediately. The next gate check on that person shows them as not cleared, and no equipment needing it can be handed to them."
      >
        <RoleActionForm
          personas={personas}
          action={revokeRoleAction}
          submitLabel="Take clearance away"
          pendingLabel="Removing…"
          variant="ghost"
        />
      </FormSection>
    </>
  );
}
