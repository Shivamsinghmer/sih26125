/**
 * Login form state, kept out of `auth-actions.ts` for the same reason
 * `action-types.ts` exists: a "use server" module may only export async
 * functions. A plain const exported from there is rewritten into a server
 * reference, and the form's initial state arrives as something with no
 * `error` field at all.
 */
export interface LoginState {
  error: string | null;
}

export const LOGIN_IDLE: LoginState = { error: null };
