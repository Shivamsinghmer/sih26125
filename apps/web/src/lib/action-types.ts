/**
 * Result shape shared by every server action.
 *
 * This lives outside `actions.ts` deliberately: a "use server" module may only
 * export async functions. A plain const exported from there is rewritten into a
 * server reference, so `IDLE.status` arrives as undefined and every result card
 * falls through to its error branch.
 */
export type ActionResult =
  | { status: "idle" }
  | { status: "success"; message: string; hash?: string }
  | {
      status: "blocked";
      title: string;
      detail: string;
      errorName?: string;
      reason: string;
    }
  | { status: "error"; message: string };

export const IDLE: ActionResult = { status: "idle" };
