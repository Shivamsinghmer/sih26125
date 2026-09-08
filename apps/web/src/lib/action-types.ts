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

/**
 * The largest photo onboarding will take.
 *
 * Lives here rather than in `actions.ts` so the form can check it too — a
 * "use server" module may only export async functions, and a constant exported
 * from one arrives on the client as a server reference rather than a number.
 *
 * Kept well under `serverActions.bodySizeLimit` in next.config.ts, so this is
 * always the limit that refuses an oversized photo. If either moves, move both.
 */
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
