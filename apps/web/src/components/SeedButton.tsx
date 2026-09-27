"use client";

import { useActionState } from "react";

import { IDLE } from "@/lib/action-types";
import { seedDemoAction } from "@/lib/actions";
import { ActionResultCard } from "./ActionResultCard";
import { Button } from "@/components/ui/button";

export function SeedButton() {
  const [result, formAction, pending] = useActionState(seedDemoAction, IDLE);

  return (
    <div className="flex flex-col gap-5">
      <form action={formAction}>
        <Button type="submit" variant="ghost" disabled={pending}>
          {pending ? "Loading…" : "Load the example data"}
        </Button>
      </form>
      <ActionResultCard result={result} />
    </div>
  );
}
