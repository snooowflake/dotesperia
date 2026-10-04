// Private native Codex + the actual background memory path, in disposable data.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { launchVerificationServer, runControlOmb } from "../scripts/control-omb.ts";
import { CAPTURE_MARKER } from "./memory-capture.ts";
import { TIDY_MARKER } from "./memory-tidy.ts";
import { readUsage } from "./usage-ledger.ts";

it("captures Codex memory automatically, recalls it in another thread and journals it locally", async () => {
  const scratch = mkdtempSync(join(tmpdir(), "dotesperia-memory-codex-"));
  const routes = join(scratch, "text-routes.json");
  const dump = join(scratch, "codex-dump.json");
  writeFileSync(routes, JSON.stringify({ [CAPTURE_MARKER]: JSON.stringify([
    { text: "The person prefers French replies", kind: "preference", confidence: 0.95, aboutUser: true },
  ]), [TIDY_MARKER]: '{"pairs":[]}' }));
  const fixture = await launchVerificationServer({ ...process.env, FAKE_CODEX_TEXT_ROUTES: routes, FAKE_CODEX_MCP_CONFIG: "{}", FAKE_CODEX_DUMP: dump }, undefined, undefined, undefined, undefined, undefined, ["codex"]);
  const api = async (path: string, method = "GET", body?: unknown) => {
    const response = await fetch(fixture.info.url + path, { method, headers: { "content-type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    expect(response.ok, `${method} ${path}`).toBe(true); return await response.json() as any;
  };
  const control = (...args: string[]) => runControlOmb([...args, "--url", fixture.info.url]) as Promise<any>;
  try {
    await api("/api/config", "PUT", { memory: { captureQuietMs: 1_000 } });
    const { bot } = await api("/api/bots", "POST", { name: "Codex memory fixture", approvalMode: "ask",
      modelSelection: { instanceId: "codex", model: "gpt-5.1-codex-max" } });
    await control("send", "--bot", bot.id, "--task", bot.threadId, "--text", "Please remember that I prefer French replies.");
    expect((await control("wait", "--bot", bot.id, "--task", bot.threadId, "--timeout", "30")).status).toBe("settled");
    await expect.poll(async () => (await api(`/api/bots/${bot.id}/memory/file`)).text, { timeout: 25_000 }).toContain("The person prefers French replies");
    expect((await api(`/api/bots/${bot.id}/memory/upkeep`)).modelSteps).toBe(true);
    expect((await api(`/api/bots/${bot.id}/memory/journal`)).entries.some((entry: any) => entry.actor === "upkeep" && entry.via === "capture")).toBe(true);
    expect((await api("/api/profile/learned")).learned[0].text).toBe("The person prefers French replies");
    await api(`/api/bots/${bot.id}`, "PATCH", { memoryUpkeep: false });
    const second = await api(`/api/bots/${bot.id}/tasks`, "POST", { title: "Another conversation" });
    const threadId = second.task?.threadId ?? second.threadId;
    await control("send", "--bot", bot.id, "--task", threadId, "--text", "What reply language do I prefer?");
    await control("wait", "--bot", bot.id, "--task", threadId, "--timeout", "30");
    expect(JSON.stringify(await api(`/api/bots/${bot.id}/system-prompt`))).toContain("The person prefers French replies");
    const received = JSON.parse(readFileSync(dump, "utf8"));
    expect(JSON.stringify(received.calls)).toContain("The person prefers French replies");
    const ledger = readUsage(fixture.info.dataDir, { from: new Date(0), to: new Date(Date.now() + 86_400_000) });
    expect(ledger.some(row => row.threadId.startsWith("memory-") && row.model === "gpt-5.1-codex-max" && row.input === 7)).toBe(true);
    console.info(JSON.stringify({ logPath: fixture.info.logPath, automaticCodexCapture: true, crossThreadRecall: true }));
  } finally { await fixture.close(); rmSync(scratch, { recursive: true, force: true }); }
}, 90_000);
