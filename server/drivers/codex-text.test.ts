import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { afterEach, expect, it } from "vitest";
import { createCodexTextGenerator } from "./codex-text.ts";

const cli = fileURLToPath(new URL("../testing/fake-codex-app-server.ts", import.meta.url));
const fixtures: Array<{ directory: string; helper: ReturnType<typeof createCodexTextGenerator> }> = [];
afterEach(async () => { for (const f of fixtures.splice(0)) {
  await f.helper.dispose(); rmSync(f.directory, { recursive: true, force: true });
} });
function fixture(extra: Record<string, string> = {}) {
  const directory = mkdtempSync(join(tmpdir(), "dotesperia-text-test-"));
  const credentialHome = join(directory, "credentials"); mkdirSync(credentialHome);
  writeFileSync(join(credentialHome, "config.toml"), '[mcp_servers.personal]\ncommand="must-not-run"\n');
  const env = { ...process.env, PATH: dirname(process.execPath), HOME: directory, USERPROFILE: directory,
    CODEX_HOME: credentialHome, FAKE_CODEX_TEXT_MODE: "happy", FAKE_CODEX_MCP_CONFIG: "{}", FAKE_CODEX_DUMP: join(directory, "dump.json"), ...extra };
  const helper = createCodexTextGenerator({ cli, environment: () => ({ ...env }), defaultModel: () => "gpt-6-astra" });
  fixtures.push({ directory, helper });
  return { directory, helper, env, dump: () => JSON.parse(readFileSync(env.FAKE_CODEX_DUMP, "utf8")) };
}

it("uses an ephemeral tool-free native thread, stdin and the selected model with real usage", async () => {
  const f = fixture({ OPENAI_API_KEY: "must-not-be-inherited", FAKE_CODEX_TEXT_MODE: "foreign" });
  const usage: unknown[] = [];
  expect(await f.helper.generateText("PRIVATE_MEMORY_PROMPT", { model: "chosen-model", onUsage: value => usage.push(value) })).toBe("TEXT_HELPER_OK");
  const recorded = f.dump();
  expect(JSON.stringify(recorded.argv)).not.toContain("PRIVATE_MEMORY_PROMPT");
  expect(recorded.env.OPENAI_API_KEY).toBeUndefined();
  expect(recorded.argv).toContain('mcp_servers."personal".enabled=false');
  expect(recorded.argv).toContain('web_search="disabled"');
  const start = recorded.calls.find((call: any) => call.method === "thread/start").params;
  expect(start).toMatchObject({ model: "chosen-model", ephemeral: true, environments: [], sandbox: "read-only", approvalPolicy: "untrusted" });
  expect(recorded.calls.find((call: any) => call.method === "turn/start").params).toMatchObject({ environments: [], sandboxPolicy: { type: "readOnly" } });
  expect(usage).toEqual([{ model: "chosen-model", input: 7, cachedInput: 4, output: 3 }]);
});

it("fails before submitting memory if native configuration ignores the confinement", async () => {
  const f = fixture({ FAKE_CODEX_IGNORE_FEATURES: "1" });
  await expect(f.helper.generateText("PRIVATE_MEMORY_PROMPT")).rejects.toThrow("tool-free");
  expect(f.dump().calls.some((call: any) => call.method === "turn/start")).toBe(false);
});

it.each(["tool", "approval"])("refuses an unexpected %s instead of granting access", async mode => {
  const f = fixture({ FAKE_CODEX_TEXT_MODE: mode });
  await expect(f.helper.generateText("Text only")).rejects.toThrow(/tool|permission/);
});

it("cancels an in-flight helper and remains separate from future calls", async () => {
  const f = fixture({ FAKE_CODEX_TEXT_MODE: "hang" });
  const controller = new AbortController();
  const call = f.helper.generateText("Text only", { signal: controller.signal });
  const outcome = call.catch(error => error as Error);
  await expect.poll(() => { try { return f.dump().calls.some((item: any) => item.method === "turn/start"); } catch { return false; } }).toBe(true);
  controller.abort(); expect(await outcome).toMatchObject({ message: "Codex text helper cancelled." });
  await f.helper.dispose();
  await expect(f.helper.generateText("Again")).rejects.toThrow("disposed");
});

it("stops background work on sign-out while allowing a later native login", async () => {
  const f = fixture({ FAKE_CODEX_TEXT_MODE: "hang" });
  const outcome = f.helper.generateText("Synthetic memory").catch(error => error as Error);
  await expect.poll(() => { try { return f.dump().calls.some((item: any) => item.method === "turn/start"); } catch { return false; } }).toBe(true);
  await f.helper.cancelAll();
  expect(await outcome).toMatchObject({ message: "Codex text helper cancelled." });
  f.env.FAKE_CODEX_TEXT_MODE = "happy";
  expect(await f.helper.generateText("After login")).toBe("TEXT_HELPER_OK");
});
