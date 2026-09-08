"use client";

import { mintAssetAction } from "@/lib/actions";
import { RoleActionForm } from "./RoleActionForm";
import type { PersonaOption } from "./TransferPanel";

export function MintPanel({ personas }: { personas: PersonaOption[] }) {
  return (
    <RoleActionForm
      personas={personas}
      action={mintAssetAction}
      submitLabel="Add equipment"
      pendingLabel="Adding…"
    />
  );
}
