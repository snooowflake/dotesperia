// The official Cua Driver runs as a separate, unprivileged desktop user.
// This adapter carries its existing tools over loopback HTTP. It implements
// neither screenshots nor keyboard/mouse actions and never receives model auth.
import { createServer, type IncomingMessage } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { pathToFileURL } from "node:url";
import { StdioMcp } from "./drivers/pi-mcp-extension.ts";

export const DESKTOP_TOOLS = new Set([
  "get_desktop_state", "get_screen", "get_screenshot", "screenshot", "get_screen_size",
  "list_apps", "list_windows", "get_window_state", "click", "double_click", "right_click",
  "move_cursor", "move", "scroll", "drag", "type_text", "key_press", "press_key", "press_keys",
  "press_shortcut", "set_value",
  "launch_app", "activate_app", "activate_window",
]);
const MAX_REQUEST = 1024 * 1024;
export interface DesktopDriver {
  listTools(): Promise<{ name: string; description?: string; inputSchema?: unknown }[]>;
  callTool(name: string, args: unknown, signal?: AbortSignal): Promise<unknown>;
}

export function createPrivateDesktopService(driver: DesktopDriver, token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new Error("A private desktop capability is required");
  let working = false;
  let ready = false;
  const expected = Buffer.from(`Bearer ${token}`);
  const authorized = (req: IncomingMessage) => {
    const actual = Buffer.from(req.headers.authorization ?? "");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  };
  const server = createServer(async (req, res) => {
    res.setHeader("content-type", "application/json");
    res.setHeader("cache-control", "no-store");
    const send = (status: number, body?: unknown) => { res.writeHead(status); res.end(body === undefined ? undefined : JSON.stringify(body)); };
    // No browser CORS, redirect, SSE session, user-supplied process or URL.
    if (req.headers.origin || !authorized(req)) return send(403, { error: "Forbidden" });
    if (req.url === "/health" && req.method === "GET") {
      if (ready) { try { await driver.listTools(); } catch { ready = false; } }
      return send(ready ? 200 : 503, { ready });
    }
    if (req.url !== "/mcp" || req.method !== "POST") return send(404);
    const abort = new AbortController();
    req.once("aborted", () => abort.abort());
    res.once("close", () => { if (!res.writableEnded) abort.abort(); });
    let frame: { id?: string | number; method?: string; params?: { name?: string; arguments?: unknown } };
    try {
      const chunks: Buffer[] = []; let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > MAX_REQUEST) return send(413);
        chunks.push(chunk);
      }
      frame = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (!frame || typeof frame !== "object" || Array.isArray(frame)) return send(400);
      if (frame.id === undefined && frame.method?.startsWith("notifications/")) return send(202);
      if (typeof frame.id !== "string" && typeof frame.id !== "number") return send(400);
    } catch { return send(400); }
    const reply = (result: unknown) => send(200, { jsonrpc: "2.0", id: frame.id, result });
    const fail = (code: number, message: string) => send(200, { jsonrpc: "2.0", id: frame.id, error: { code, message } });
    if (frame.method === "initialize") return reply({ protocolVersion: "2025-03-26", capabilities: { tools: {} }, serverInfo: { name: "dotesperia-private-desktop", version: "1" } });
    if (frame.method === "ping") return reply({});
    if (frame.method === "tools/list") {
      try { return reply({ tools: (await driver.listTools()).filter(tool => DESKTOP_TOOLS.has(tool.name)) }); }
      catch { return fail(-32000, "Desktop unavailable"); }
    }
    if (frame.method !== "tools/call" || !frame.params?.name || !DESKTOP_TOOLS.has(frame.params.name)) {
      return fail(-32601, "Tool or method unavailable in the private desktop");
    }
    if (working) return fail(-32000, "Desktop is already performing an action; retry after it finishes");
    working = true;
    try { return reply(await driver.callTool(frame.params.name, frame.params.arguments, AbortSignal.any([abort.signal, AbortSignal.timeout(60000)]))); }
    catch { return fail(-32000, "Desktop action cancelled or unavailable"); }
    finally { working = false; }
  });
  return { server, setReady: (value: boolean) => { ready = value; } };
}

async function main() {
  if (process.getuid?.() === 0) throw new Error("Private desktop must not run as root");
  const executable = process.env.DOTESPERIA_CUA_DRIVER;
  if (!executable?.startsWith("/") || !process.env.DISPLAY || !process.env.HOME) throw new Error("Desktop environment missing");
  const driver = new StdioMcp({ command: executable, args: ["mcp", "--direct", "--no-overlay"], env: { DOTESPERIA_DESKTOP_TOKEN: "" } });
  await driver.init();
  const tools = await driver.listTools();
  if (!tools.some(tool => tool.name === "click") || !tools.some(tool => tool.name === "type_text")) throw new Error("Native desktop tools missing");
  const service = createPrivateDesktopService(driver, process.env.DOTESPERIA_DESKTOP_TOKEN ?? "");
  service.setReady(true);
  // A failed native child must restart the session even when no viewer is
  // polling /health. Keep the check bounded and non-overlapping.
  let checking = false;
  const watchdog = setInterval(async () => {
    if (checking) return;
    checking = true;
    try { await driver.listTools(); }
    catch { service.setReady(false); process.exit(1); }
    finally { checking = false; }
  }, 15000);
  watchdog.unref();
  const port = Number(process.env.DOTESPERIA_DESKTOP_PORT ?? "18902");
  if (!Number.isInteger(port) || port < 10000 || port > 65535) throw new Error("Invalid desktop port");
  service.server.listen(port, "127.0.0.1");
  for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => {
    clearInterval(watchdog);
    service.setReady(false); service.server.closeAllConnections(); service.server.close(); driver.dispose();
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(() => {
  process.stderr.write("Private desktop startup failed\n"); process.exit(1);
});
