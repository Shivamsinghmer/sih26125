"use client";

import { grantRoleAction, revokeRoleAction } from "@/lib/actions";
import { RoleActionForm } from "./RoleActionForm";
import type { PersonaOption } from "./TransferPanel";

export function CredentialsPanel({ personas }: { personas: PersonaOption[] }) {
  return (
    <div className="grid gap-12 lg:grid-cols-2">
      <div>
        <h2 className="text-subheading leading-subheading">Issue a credential</h2>
        <p className="mt-1 max-w-[52ch] text-caption leading-caption text-label">
          Writes the grant and its expiry to RoleRegistry. From that moment the
          token contract will let this person receive assets requiring that role.
        </p>
        <div className="mt-5">
          <RoleActionForm
            personas={personas}
            action={grantRoleAction}
            submitLabel="Issue credential"
            pendingLabel="Issuing…"
            showDuration
          />
        </div>
      </div>

      <div>
        <h2 className="text-subheading leading-subheading">Revoke a credential</h2>
        <p className="mt-1 max-w-[52ch] text-caption leading-caption text-label">
          One transaction. Every verifier sees it on their next check — including
          offline ones, on their next sync.
        </p>
        <div className="mt-5">
          <RoleActionForm
            personas={personas}
            action={revokeRoleAction}
            submitLabel="Revoke credential"
            pendingLabel="Revoking…"
            variant="ghost"
          />
        </div>
      </div>
    </div>
  );
}
