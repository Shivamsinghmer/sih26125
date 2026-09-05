"use client";

import { useActionState } from "react";

import { IDLE } from "@/lib/action-types";
import { seedDemoAction } from "@/lib/actions";
import { ActionResultCard } from "./ActionResultCard";
import { PillButton } from "./ui";

export function SeedButton() {
  const [result, formAction, pending] = useActionState(seedDemoAction, IDLE);

  return (
    <div className="flex flex-col gap-5">
      <form action={formAction}>
        <PillButton type="submit" disabled={pending}>
          {pending ? "Seeding…" : "Seed the demo"}
        </PillButton>
      </form>
      <ActionResultCard result={result} />
    </div>
  );
}
