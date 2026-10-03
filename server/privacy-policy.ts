export const CODEX_ORIGINS = ["https://chatgpt.com", "https://auth.openai.com", "https://api.openai.com"] as const;
const FORBIDDEN_DOMAINS = ["posthog.com", "composio.dev", "ascii.dev", "botdirectory.ai", "openmausbot.com", "openmausbot.dev"];
const loopback = (host: string) => ["localhost", "127.0.0.1", "::1", "[::1]"].includes(host);
const forbidden = (host: string) => FORBIDDEN_DOMAINS.some(domain => host === domain || host.endsWith(`.${domain}`));

export class PrivacyRefusal extends Error {
  constructor() { super("Dotesperia privacy policy refused an unapproved network destination."); }
}

export function ownerOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  let values: unknown;
  try { values = JSON.parse(raw); } catch { throw new Error("DOTESPERIA_OWNER_ORIGINS must be a JSON array of exact origins."); }
  if (!Array.isArray(values) || values.length > 64 || values.some(value => typeof value !== "string")) {
    throw new Error("DOTESPERIA_OWNER_ORIGINS must be an array of at most 64 exact origins.");
  }
  return values.map(value => {
    let url: URL;
    try { url = new URL(value); } catch { throw new Error("Invalid owner origin in privacy policy."); }
    if (!["http:", "https:"].includes(url.protocol) || url.hostname.includes("*") || url.username || url.password || url.pathname !== "/" || url.search || url.hash || forbidden(url.hostname)) {
      throw new Error("Owner destinations must be exact HTTP(S) origins without credentials, paths, queries, or vendor services.");
    }
    return url.origin;
  });
}

export function createPrivacyPolicy(owners: readonly string[] = []) {
  const origins = new Set([...CODEX_ORIGINS, ...ownerOrigins(JSON.stringify(owners))]);
  return {
    assertUrl(value: string | URL): void {
      let url: URL;
      try { url = new URL(value); } catch { throw new PrivacyRefusal(); }
      if (url.username || url.password || !["http:", "https:", "ws:", "wss:"].includes(url.protocol) || forbidden(url.hostname)) throw new PrivacyRefusal();
      const origin = `${url.protocol === "ws:" ? "http:" : url.protocol === "wss:" ? "https:" : url.protocol}//${url.host}`;
      if (!loopback(url.hostname) && !origins.has(origin)) throw new PrivacyRefusal();
    },
    assertSocket(host: string, port: number): void {
      host = host.toLowerCase().replace(/^\[|\]$/g, "");
      if (loopback(host)) return;
      if (forbidden(host) || ![...origins].some(origin => {
        const url = new URL(origin);
        return url.hostname.replace(/^\[|\]$/g, "") === host && Number(url.port || (url.protocol === "https:" ? 443 : 80)) === port;
      })) throw new PrivacyRefusal();
    },
    status: { telemetry: false, cloudModel: "codex-chatgpt", ownerOrigins: [...owners], networkIsolationRequired: true },
  };
}

export function guardedFetch(policy: ReturnType<typeof createPrivacyPolicy>, transport: typeof fetch): typeof fetch {
  return async (input, init) => {
    policy.assertUrl(input instanceof Request ? input.url : String(input));
    const request = new Request(input, init);
    policy.assertUrl(request.url);
    // A redirect must never forward a body or credential before a second check.
    // Configure the final URL of an owner-hosted service instead.
    return transport(request, { redirect: "error" });
  };
}

export function blockedPrivateRoute(path: string): boolean {
  return /^\/api\/(?:connectors|box|boats|cloud-move|cloud-account|bot-directory|directory|hosted|organization|desktop\/(?:organization|backups|cloud))(?:\/|$)/.test(path)
    || /^\/api\/(?:engines|instances)\/[^/]+\/(?:install|update)(?:\/|$)/.test(path)
    || path === "/api/browser-engine/install";
}
