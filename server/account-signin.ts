// Vendor email authentication was removed. Access uses private local pairing.
import type { Scope } from "./sessions.ts";
import type { ControlPlaneClient } from "../electron/control-plane-client.mjs";
/** Who may sign in. `a@b.com` is that address; `@b.com` is everyone at b.com. */
export interface SignInAllowList {
  admins: string[];
  members: string[];
}

/** Commas, spaces or newlines between entries; case does not matter. */
export function parseAllowList(value: string | undefined | null): string[] {
  return (value ?? "")
    .split(/[,\s]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function allowedScopes(rawEmail: string, list: SignInAllowList): Scope[] | null {
  const email = rawEmail.trim().toLowerCase();
  if (!email.includes("@")) return null;
  const matches = (entry: string) => (entry.startsWith("@") ? email.endsWith(entry) && email.length > entry.length : entry === email);
  if (list.admins.some(matches)) return ["admin", "client"];
  if (list.members.some(matches)) return ["client"];
  return null;
}

export function signInEnabled(list: SignInAllowList): boolean {
  void list; return false;
}

export type SignInFailure = { ok: false; status: number; error: string };

export interface EmailSignIn {
  enabled(): boolean;
  start(email: string): Promise<{ ok: true } | SignInFailure>;
  verify(email: string, code: string): Promise<{ ok: true; email: string; userId: string; scopes: Scope[] } | SignInFailure>;
}

export function createEmailSignIn(_options: { allow: SignInAllowList | (() => SignInAllowList); env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch; client?: ControlPlaneClient }): EmailSignIn {
  const refusal: SignInFailure = { ok: false, status: 403, error: "Vendor email sign-in removed; use local pairing" };
  return { enabled: () => false, start: async () => refusal, verify: async () => refusal };
}
