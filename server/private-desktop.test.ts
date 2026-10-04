import { afterEach, describe, expect, it } from "vitest";
import { createPrivateDesktopService } from "./private-desktop-service.ts";
import { privateDesktopConfig, privateDesktopRpc } from "./private-desktop-config.ts";
import type { Server } from "node:http";

const token = "a".repeat(64);
const servers: Server[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); })));
});
async function fixture(call = async () => ({ content: [{ type: "text", text: "done" }] })) {
  const calls: string[] = [];
  const service = createPrivateDesktopService({
    async listTools() { return [{ name: "click" }, { name: "type_text" }, { name: "check_for_update" }, { name: "config_set" }]; },
    async callTool(name) { calls.push(name); return call(); },
  }, token);
  service.setReady(true);
  servers.push(service.server);
  await new Promise<void>(resolve => service.server.listen(0, "127.0.0.1", resolve));
  const address = service.server.address();
  if (!address || typeof address === "string") throw new Error("No test endpoint");
  const url = `http://127.0.0.1:${address.port}`;
  const rpc = (method: string, params = {}, headers = {}) => fetch(`${url}/mcp`, {
    method: "POST", headers: { authorization: `Bearer ${token}`, ...headers }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  return { url, rpc, calls };
}
describe("private desktop", () => {
  it("claims only actual actions, refuses competing turns and rechecks expired turns", async () => {
    const cfg = privateDesktopConfig({ DOTESPERIA_DESKTOP_URL: "http://127.0.0.1:18902", DOTESPERIA_DESKTOP_TOKEN: token, DOTESPERIA_DESKTOP_VIEWER_PORT: "18903" })!;
    let claims = 0, calls = 0;
    const options = { config: cfg, claim: () => { claims++; return true; }, assertActive: () => {},
      fetch: (async () => { calls++; return Response.json({ result: { tools: [] } }); }) as typeof fetch };
    await privateDesktopRpc({ method: "tools/list" }, options);
    expect(claims).toBe(0);
    await privateDesktopRpc({ method: "tools/call" }, options);
    expect(claims).toBe(1);
    await expect(privateDesktopRpc({ method: "tools/call" }, { ...options, claim: () => false })).rejects.toMatchObject({ status: 409 });
    expect(calls).toBe(2);
    await expect(privateDesktopRpc({ method: "tools/list" }, { ...options, assertActive: () => { throw new Error("expired"); } })).rejects.toThrow("expired");
    expect(calls).toBe(2);
    let checks = 0;
    await expect(privateDesktopRpc({ method: "tools/list" }, { ...options, assertActive: () => { if (++checks === 2) throw new Error("settled during capture"); } })).rejects.toThrow("settled during capture");
  });
  it("refuses remote deployment endpoints and missing capabilities", () => {
    expect(privateDesktopConfig({})).toBeNull();
    const cfg = { DOTESPERIA_DESKTOP_URL: "http://127.0.0.1:18902", DOTESPERIA_DESKTOP_TOKEN: token, DOTESPERIA_DESKTOP_VIEWER_PORT: "18903" };
    expect(privateDesktopConfig(cfg)?.viewerPort).toBe(18903);
    for (const url of ["https://example.com", "http://localhost:18902", "http://127.0.0.1:18902/mcp", "http://x@127.0.0.1:18902"])
      expect(() => privateDesktopConfig({ ...cfg, DOTESPERIA_DESKTOP_URL: url })).toThrow();
    expect(() => privateDesktopConfig({ ...cfg, DOTESPERIA_DESKTOP_TOKEN: "" })).toThrow();
  });
  it("requires a capability and refuses browser-origin requests", async () => {
    const f = await fixture();
    expect((await fetch(`${f.url}/health`)).status).toBe(403);
    expect((await f.rpc("tools/list", {}, { origin: "http://127.0.0.1" })).status).toBe(403);
    expect(f.calls).toEqual([]);
  });
  it("exposes only native observation and input tools", async () => {
    const f = await fixture();
    expect((await (await f.rpc("tools/list")).json() as any).result.tools.map((tool: { name: string }) => tool.name)).toEqual(["click", "type_text"]);
    const refused = await (await f.rpc("tools/call", { name: "config_set", arguments: {} })).json() as any;
    expect(refused.error.code).toBe(-32601);
    expect(f.calls).toEqual([]);
    const allowed = await (await f.rpc("tools/call", { name: "click", arguments: {} })).json() as any;
    expect(allowed.result.content[0].text).toBe("done");
    expect(f.calls).toEqual(["click"]);
  });
  it("does not run overlapping desktop actions", async () => {
    let release!: () => void;
    const f = await fixture(() => new Promise(resolve => { release = () => resolve({ content: [{ type: "text", text: "done" }] }); }));
    const first = f.rpc("tools/call", { name: "click" });
    await new Promise(resolve => setTimeout(resolve, 50));
    const second = await (await f.rpc("tools/call", { name: "type_text" })).json() as any;
    expect(second.error.message).toContain("already performing");
    release(); await first;
    expect(f.calls).toEqual(["click"]);
  });
});
