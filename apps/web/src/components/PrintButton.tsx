"use client";

import { Button } from "@/components/ui/button";

/** window.print() needs a client boundary; everything else on the card page is server-rendered. */
export function PrintButton() {
  return (
    <Button type="button" onClick={() => window.print()}>
      Print card
    </Button>
  );
}
