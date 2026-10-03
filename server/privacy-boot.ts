import { Socket } from "node:net";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { createPrivacyPolicy, guardedFetch, ownerOrigins, PrivacyRefusal } from "./privacy-policy.ts";
import { enablePrivateRuntime } from "./privacy-runtime.ts";

if (process.getuid?.() === 0) throw new Error("Dotesperia must run as a dedicated non-root user.");
for (const key of Object.keys(process.env)) {
  if (/^OMB_CLOUD_|^OMB_COMPOSIO_BROKER_|^OMB_TUNNEL_SOCKET$/.test(key) && process.env[key]) {
    throw new Error(`Dotesperia refuses hosted-service configuration (${key}).`);
  }
}
const dataDir = resolve(process.env.OMB_DATA_DIR || resolve(homedir(), ".dotesperia"));
if (/(?:^|[\\/])\.(?:hermes|codex|openmausbot|opengrokbot)(?:[\\/]|$)/i.test(dataDir)) {
  throw new Error("Choose a new Dotesperia data directory, separate from existing agents.");
}
delete process.env.HERMES_HOME;
delete process.env.CODEX_HOME;
enablePrivateRuntime();
export const PRIVACY_POLICY = createPrivacyPolicy(ownerOrigins(process.env.DOTESPERIA_OWNER_ORIGINS));
globalThis.fetch = guardedFetch(PRIVACY_POLICY, globalThis.fetch.bind(globalThis));

// Covers JS HTTP(S), ws and raw sockets before adapters cache their references.
// Native children and browsers additionally need the dedicated user's firewall.
const connect = Socket.prototype.connect;
Socket.prototype.connect = function (this: Socket, ...args: unknown[]) {
  const normalized = Array.isArray(args[0]) ? args[0] : args;
  const first = normalized[0];
  if (first && typeof first === "object") {
    const options = first as { path?: string; host?: string; hostname?: string; port?: number | string };
    if (!options.path) PRIVACY_POLICY.assertSocket(options.host || options.hostname || "localhost", Number(options.port));
  } else if (typeof first === "number" || (typeof first === "string" && /^\d+$/.test(first))) {
    PRIVACY_POLICY.assertSocket(typeof normalized[1] === "string" ? normalized[1] : "localhost", Number(first));
  } else if (typeof first !== "string") {
    throw new PrivacyRefusal();
  }
  return Reflect.apply(connect, this, args);
} as typeof connect;

export const BOOT_CLOUD_SECRETS: Readonly<Record<string, string>> = Object.freeze({});
