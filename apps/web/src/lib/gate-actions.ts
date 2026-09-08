"use server";

import { isAddress, type Address } from "viem";

import { addressFromDid, isSupportedDid } from "@sih26125/identity";

import type { GateState } from "./gate-types";
import { lookupIdentity } from "./state";

/**
 * Resolve whatever the guard's scanner produced.
 *
 * A QR on a card encodes a full `did:ethr:...`, but people also paste bare
 * addresses, so both are accepted. Anything else is rejected with a message
 * that says what was expected rather than a generic failure.
 */
export async function gateCheckAction(
  _prev: GateState,
  formData: FormData,
): Promise<GateState> {
  const raw = String(formData.get("identifier") ?? "").trim();
  if (!raw) return { status: "error", message: "Scan a card, or type the ID printed on it." };

  let address: Address;
  if (isSupportedDid(raw)) {
    address = addressFromDid(raw) as Address;
  } else if (isAddress(raw)) {
    address = raw;
  } else {
    return {
      status: "error",
      message: "That is not an ID this system recognises. Check the card and try again.",
    };
  }

  try {
    const result = await lookupIdentity(address);
    if (!result) {
      return {
        status: "error",
        message:
          "The shared record cannot be reached, so no check can be trusted right now. Call the issuing authority.",
      };
    }
    return { status: "found", result };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "The check could not be completed.",
    };
  }
}
