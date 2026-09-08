"use client";

import { grantRoleAction, revokeRoleAction } from "@/lib/actions";
import { RoleActionForm } from "./RoleActionForm";
import type { PersonaOption } from "./TransferPanel";

export function CredentialsPanel({ personas }: { personas: PersonaOption[] }) {
  return (
    <div className="grid gap-12 lg:grid-cols-2">
      <div>
        <h2 id="issue" className="scroll-mt-6 text-subheading leading-subheading">Give a clearance</h2>
        <p className="mt-1 max-w-[52ch] text-caption leading-caption text-label">
          From the moment you press the button, this person can be handed
          equipment that needs this clearance &mdash; until the end date you
          choose.
        </p>
        <div className="mt-5">
          <RoleActionForm
            personas={personas}
            action={grantRoleAction}
            submitLabel="Give clearance"
            pendingLabel="Giving…"
            showDuration
          />
        </div>
      </div>

      <div>
        <h2 id="revoke" className="scroll-mt-6 text-subheading leading-subheading">Take one away</h2>
        <p className="mt-1 max-w-[52ch] text-caption leading-caption text-label">
          Applies immediately. The next gate check on that person shows them as
          not cleared, and no equipment needing it can be handed to them.
        </p>
        <div className="mt-5">
          <RoleActionForm
            personas={personas}
            action={revokeRoleAction}
            submitLabel="Take clearance away"
            pendingLabel="Removing…"
            variant="ghost"
          />
        </div>
      </div>
    </div>
  );
}
