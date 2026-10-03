/** Operator-owned desktop endpoints. No browser or bot may choose a destination. */
export function privateDesktopConfig(env: NodeJS.ProcessEnv = process.env) {
  if (!env.DOTESPERIA_DESKTOP_URL) return null;
  const url = new URL(env.DOTESPERIA_DESKTOP_URL);
  const token = env.DOTESPERIA_DESKTOP_TOKEN ?? "";
  const viewerPort = Number(env.DOTESPERIA_DESKTOP_VIEWER_PORT);
  if (url.protocol !== "http:" || url.hostname !== "127.0.0.1" || !url.port || url.pathname !== "/"
    || url.username || url.password || url.search || url.hash || !/^[a-f0-9]{64}$/.test(token)
    || !Number.isInteger(viewerPort) || viewerPort < 10000 || viewerPort > 65535) {
    throw new Error("Invalid private desktop deployment configuration");
  }
  return { url: url.origin, token, viewerPort };
}

export async function privateDesktopReady(config: NonNullable<ReturnType<typeof privateDesktopConfig>>) {
  try {
    const response = await fetch(`${config.url}/health`, {
      headers: { authorization: `Bearer ${config.token}` }, signal: AbortSignal.timeout(3000), redirect: "error",
    });
    return response.ok && (await response.json() as { ready?: unknown }).ready === true;
  } catch { return false; }
}

/** Claim the shared desktop only on the first action, for this active turn.
 * Catalog discovery leaves other chats free to run. Provider children see a
 * revocable turn capability, never the reusable desktop service credential. */
export async function privateDesktopRpc(body: { method?: string; params?: unknown }, options: {
  config: NonNullable<ReturnType<typeof privateDesktopConfig>>;
  assertActive: () => void; claim: () => boolean; signal?: AbortSignal;
  fetch?: typeof fetch;
}) {
  if (body.method !== "tools/list" && body.method !== "tools/call") throw Object.assign(new Error("Unknown desktop MCP method"), { status: 400 });
  options.assertActive();
  if (body.method === "tools/call" && !options.claim()) throw Object.assign(new Error("Le bureau privé est utilisé par une autre tâche. Attends sa fin."), { status: 409 });
  const response = await (options.fetch ?? fetch)(`${options.config.url}/mcp`, {
    method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${options.config.token}` },
    redirect: "error", signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(60000)]) : AbortSignal.timeout(60000),
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: body.method, params: body.params ?? {} }),
  });
  if (!response.ok) throw Object.assign(new Error("Private desktop unavailable"), { status: 502 });
  const result = await response.json() as { result?: unknown; error?: { message?: string } };
  options.assertActive();
  if (result.error || !Object.hasOwn(result, "result")) throw Object.assign(new Error(result.error?.message ?? "Private desktop unavailable"), { status: 502 });
  return result.result;
}
