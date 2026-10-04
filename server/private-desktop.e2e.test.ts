import { readFileSync, unlinkSync } from "node:fs";
import { expect, it } from "vitest";
import { createPrivateDesktopService } from "./private-desktop-service.ts";
import { freePortBlock } from "./testing/ports.ts";
import { launchVerificationServer, runControlOmb } from "../scripts/control-omb.ts";

it("mounts a revocable desktop capability, claims actions lazily and releases on interrupt", async () => {
  const token = "b".repeat(64), port = await freePortBlock([0, 1]);
  let calls = 0;
  const desktop = createPrivateDesktopService({
    async listTools() { return [{ name: "get_desktop_state", inputSchema: { type: "object" } }]; },
    async callTool() { calls++; return { content: [{ type: "text", text: "Synthetic desktop" }] }; },
  }, token);
  desktop.setReady(true);
  await new Promise<void>(resolve => desktop.server.listen(port, "127.0.0.1", resolve));
  const fixture = await launchVerificationServer({ ...process.env, FAKE_CLAUDE_MODE: "hang" },
    undefined, undefined, undefined, undefined, undefined, [], undefined,
    { url: `http://127.0.0.1:${port}`, token, viewerPort: port + 1 });
  const api = async (path: string, method: string, body: unknown) => {
    const response = await fetch(fixture.info.url + path, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    expect(response.ok, path).toBe(true); return response.json() as Promise<any>;
  };
  const control = (...args: string[]) => runControlOmb([...args, "--url", fixture.info.url]);
  const start = async (name: string) => {
    const { bot } = await api("/api/bots", "POST", { name, computer: "browser", approvalMode: "ask", memoryUpkeep: false });
    await control("send", "--bot", bot.id, "--task", bot.threadId, "--text", "Synthetic held turn");
    await expect.poll(() => { try { return JSON.parse(readFileSync(fixture.fixtureDumpPath, "utf8")).mcpConfig; } catch { return null; } }, { timeout: 15000 }).toBeTruthy();
    const dump = JSON.parse(readFileSync(fixture.fixtureDumpPath, "utf8"));
    expect(JSON.stringify(dump)).not.toContain(token);
    const gate = dump.mcpConfig.mcpServers.private_desktop;
    expect(gate.args.at(-1)).toMatch(/mcp-gate\.ts$/);
    const spec = JSON.parse(gate.env.OMB_GATE_UPSTREAM);
    expect(spec.args.at(-1)).toBe("computer");
    expect(spec.env.OMB_MCP_TOKEN).toBeTruthy();
    expect(dump.env).not.toHaveProperty("DOTESPERIA_DESKTOP_TOKEN");
    unlinkSync(fixture.fixtureDumpPath);
    return { bot, capability: spec.env.OMB_MCP_TOKEN };
  };
  const rpc = (capability: string, method: string) => fetch(fixture.info.url + "/api/internal/computer/mcp", {
    method: "POST", headers: { authorization: `Bearer ${capability}`, "content-type": "application/json" },
    body: JSON.stringify({ method, params: method === "tools/call" ? { name: "get_desktop_state", arguments: {} } : {} }),
  });
  try {
    const first = await start("First synthetic Dot"), second = await start("Second synthetic Dot");
    expect((await rpc(first.capability, "tools/list")).status).toBe(200);
    expect((await rpc(second.capability, "tools/list")).status).toBe(200);
    expect(calls).toBe(0);
    expect((await rpc(first.capability, "tools/call")).status).toBe(200);
    expect((await rpc(second.capability, "tools/list")).status).toBe(200);
    expect((await rpc(second.capability, "tools/call")).status).toBe(409);
    expect(calls).toBe(1);
    await control("interrupt", "--bot", first.bot.id, "--task", first.bot.threadId);
    await expect.poll(async () => (await rpc(first.capability, "tools/call")).status, { timeout: 5000 }).toBe(401);
    await control("wait", "--bot", first.bot.id, "--task", first.bot.threadId, "--timeout", "30");
    expect((await rpc(second.capability, "tools/call")).status).toBe(200);
    expect(calls).toBe(2);
  } finally {
    await fixture.close();
    desktop.server.closeAllConnections();
    await new Promise<void>(resolve => desktop.server.close(() => resolve()));
  }
}, 60000);
