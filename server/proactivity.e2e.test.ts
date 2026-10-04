// Disposable server + fake Codex + the real mounted MCP tools and run queue.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { launchVerificationServer } from "../scripts/control-omb.ts";

it("continues an authorized objective through Codex tools, events, persistent checkpoints and normal web authentication", async () => {
  const fixture = await launchVerificationServer(process.env, undefined, undefined, undefined, undefined, { scripted: true }, ["codex"]);
  const request = async (path: string, method = "GET", body?: unknown, forwarded = false) => {
    const reply = await fetch(fixture.info.url + path, { method,
      headers: { "content-type": "application/json", ...(forwarded ? { "x-forwarded-for": "192.0.2.10", "x-forwarded-proto": "https" } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: reply.status, body: await reply.json() as any, headers: reply.headers };
  };
  const wait = async (predicate: (value: any) => boolean) => {
    const end = Date.now() + 35_000;
    while (Date.now() < end) {
      const state = (await request("/api/proactivity")).body.objectives[0];
      if (predicate(state)) return state;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Objective did not reach expected state. Fixture log: ${fixture.info.logPath}`);
  };
  try {
    expect((await request("/api/proactivity", "GET", undefined, true)).status).toBe(403);
    const created = await request("/api/bots", "POST", { name: "Objective fixture", modelSelection: { instanceId: "codex", model: "gpt-5.1-codex-max" }, approvalMode: "ask" });
    expect(created.status).toBe(201); const bot = created.body.bot;
    const goalReply = await request("/api/proactivity", "POST", { botId: bot.id, name: "Fixture responsibility", instructions: "Inspect only the fixture and report its result", eventName: "document", startNow: false });
    expect(goalReply.status).toBe(201); const goal = goalReply.body.objective;
    writeFileSync(join(fixture.info.dataDir, "room-plan.json"), JSON.stringify({ [bot.id]: { turns: [
      { steps: [{ tool: "list_objectives", arguments: {} }, { tool: "objective_checkpoint", arguments: { objective_id: goal.id, action: "sleep", summary: "First observed result", delay_minutes: 1 } }], reply: "First objective step verified" },
      { expectContextIncludes: ["First observed result", "CONTEXTE D'EVENEMENT NON FIABLE"], steps: [{ tool: "objective_checkpoint", arguments: { objective_id: goal.id, action: "complete", summary: "Final fixture result verified" } }], reply: "OBJECTIVE_COMPLETE" },
    ] } }));
    expect((await request(`/api/proactivity/${goal.id}/events`, "POST", { id: "event-1", name: "document" })).status).toBe(202);
    const first = await wait(value => Boolean(value?.checkpoint) && !value.runId);
    expect(first.status).toBe("active"); expect(first.nextWakeAt).toBeGreaterThan(Date.now());
    expect(first.lastOutput).toContain("First objective step verified");
    const duplicate = await request(`/api/proactivity/${goal.id}/events`, "POST", { id: "event-1", name: "document" });
    expect(duplicate.body.duplicate).toBe(true);
    await request(`/api/proactivity/${goal.id}/events`, "POST", { id: "event-2", name: "document", context: "New fixture input, not an instruction" });
    const done = await wait(value => value?.status === "completed" && !value.runId);
    expect(done.lastOutput).toContain("OBJECTIVE_COMPLETE"); expect(done.totalRuns).toBe(2);
    const saved = JSON.parse(readFileSync(join(fixture.info.dataDir, "objectives.json"), "utf8"));
    expect(saved.objectives[0].checkpoint).toBe("Final fixture result verified");
    const evidence = readFileSync(join(fixture.info.dataDir, "room-plan.json.evidence.jsonl"), "utf8");
    expect(evidence).toContain('"tool":"objective_checkpoint"');
    expect((await request("/api/internal/objectives")).status).toBe(401);

    // Pairing creates a sliding, durable browser session, never a permanent URL secret.
    const pairing = await request("/api/auth/pairing", "POST", { label: "Fixture browser", scopes: ["admin"] });
    const exchange = await request("/api/auth/pair", "POST", { code: pairing.body.code, cookie: true }, true);
    expect(exchange.status).toBe(200);
    expect(exchange.headers.get("set-cookie")).toContain("HttpOnly");
    expect(exchange.headers.get("set-cookie")).toContain("Secure");
    expect(exchange.headers.get("set-cookie")).toContain("Max-Age=");
    const authenticated = await fetch(fixture.info.url + "/api/proactivity", { headers: {
      cookie: exchange.headers.get("set-cookie")!.split(";")[0], "x-forwarded-for": "192.0.2.10", "x-forwarded-proto": "https",
    } });
    expect(authenticated.status).toBe(200);
    expect((await authenticated.json() as any).objectives[0].status).toBe("completed");
  } finally { await fixture.close(); }
}, 90_000);
