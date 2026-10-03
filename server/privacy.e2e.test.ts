import { expect, it } from "vitest";
import { launchVerificationServer, runControlOmb } from "../scripts/control-omb.ts";

it("starts a private fixture, completes a Codex turn and refuses hosted config/routes", async () => {
  const fixture = await launchVerificationServer(process.env, undefined, undefined, undefined, undefined, undefined, ["codex"]);
  const call = async (path: string, method = "GET", body?: unknown) => {
    const response = await fetch(`${fixture.info.url}${path}`, { method, headers: { "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, body: await response.json() as any };
  };
  try {
    const privacy = await call("/api/privacy");
    expect(privacy.status).toBe(200);
    expect(privacy.body.telemetry).toBe(false);
    expect(privacy.body.cloudModel).toBe("codex-chatgpt");
    expect((await call("/api/connectors")).status).toBe(403);
    expect((await call("/api/cloud-move", "POST", {})).status).toBe(403);
    expect((await call("/api/config", "PUT", { composio: { apiKey: "private-fixture-secret" } })).status).toBeGreaterThanOrEqual(400);
    const created = await call("/api/bots", "POST", { name: "Private Dot", modelSelection: { instanceId: "codex", model: "gpt-5.1-codex-max" }, approvalMode: "ask" });
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    const bot = created.body.bot;
    const sent = await call(`/api/bots/${bot.id}/messages`, "POST", { text: "Verify private persistent chat" });
    expect(sent.status).toBe(202);
    const done = await runControlOmb(["wait", "--bot", bot.id, "--task", bot.threadId, "--url", fixture.info.url]);
    expect(done).toBeDefined();
    const messages = await runControlOmb(["messages", "--bot", bot.id, "--task", bot.threadId, "--url", fixture.info.url]);
    expect(JSON.stringify(messages)).toContain("Verify private persistent chat");
  } finally { await fixture.close(); }
}, 60_000);
