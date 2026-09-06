"use client";

import { PillButton } from "./ui";

/** window.print() needs a client boundary; everything else on the card page is server-rendered. */
export function PrintButton() {
  return (
    <PillButton type="button" onClick={() => window.print()}>
      Print card
    </PillButton>
  );
}
