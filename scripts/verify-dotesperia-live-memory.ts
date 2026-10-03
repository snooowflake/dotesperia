// Explicit live-provider check: synthetic facts in disposable application data.
// Native Codex uses Dotesperia's own login; Hermes is never a source of credentials.
import "../server/privacy-boot.ts";
import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { DATA_DIR } from "../server/config.ts";
import { CodexDriver } from "../server/drivers/codex.ts";
import { createMemoryUpkeep } from "../server/memory-upkeep.ts";
import { listMemoryTopics, workspaceDir } from "../server/workspace.ts";

const credentials = process.env.DOTESPERIA_VERIFY_CODEX_HOME;
if (!DATA_DIR.startsWith("/home/dotesperia/validation-") || !credentials ||
  !realpathSync(credentials).startsWith("/home/dotesperia/.dotesperia/providers/codex/")) {
  throw new Error("Live verification needs disposable Dotesperia data and its own native login.");
}
if (existsSync(join(DATA_DIR, "live-memory-result.json"))) throw new Error("Use a fresh verification directory.");
const provider = await CodexDriver.create({
  instanceId: "live-verification", displayName: "Synthetic verification", enabled: true,
  config: CodexDriver.decodeConfig({ cli: "/opt/dotesperia/tooling/node_modules/.bin/codex" }),
  environment: { CODEX_HOME: credentials },
});
const id = randomUUID();
const bot = { id, name: "Synthetic memory check", memoryEnabled: true, memoryUpkeep: true };
const recordedUsage: unknown[] = [];
const learned: string[] = [];
const memory = createMemoryUpkeep({
  bots: () => [bot], bot: value => value === id ? bot : undefined,
  engine: () => ({ generateText: (prompt, options) => provider.generateText!(prompt, {
    ...options, model: "gpt-6-astra", onUsage: value => recordedUsage.push(value),
  }) }), busy: () => false,
  addToAboutMe: (_from, texts) => { learned.push(...texts); return texts.length; },
  sourceLabel: () => 'chat "Synthetic verification"', quietMs: () => 1_000, tidyHour: () => 3,
});
try {
  const snapshot = await provider.snapshot();
  if (!snapshot.authenticated || !provider.generateText) throw new Error("The dedicated Codex login is unavailable.");
  const report = await memory.capture({ botId: id, threadId: randomUUID(), turns: [
    { person: "I prefer answers in French and I prefer brief replies.", bot: "These preferences are understood." },
  ] });
  let notes = readFileSync(join(workspaceDir(id), "MEMORY.md"), "utf8");
  for (const topic of listMemoryTopics(id)) notes += "\n" + readFileSync(join(workspaceDir(id), "memory", topic.name), "utf8");
  if (report.added + report.topics < 1 || !/French|fran[cç]ais/i.test(notes)) throw new Error("The real model did not capture the synthetic language preference.");
  const recalled = await provider.generateText!(
    `Stored notes from another conversation:\n${notes}\nWhich reply language is preferred? Answer only FR if it is French.`,
    { model: "gpt-6-astra", onUsage: value => recordedUsage.push(value) },
  );
  if (recalled.trim() !== "FR") throw new Error("The new native conversation did not recall the stored preference.");
  const result = { passed: true, model: "gpt-6-astra", automaticCapture: true, freshNativeThreadRecall: true,
    localJournal: existsSync(join(DATA_DIR, "memory-journal")), learnedPreferenceCount: learned.length,
    modelCallsWithUsage: recordedUsage.length, dataDir: DATA_DIR, sourceLogin: "Dotesperia only" };
  writeFileSync(join(DATA_DIR, "live-memory-result.json"), JSON.stringify(result, null, 2), { mode: 0o600 });
  console.log(JSON.stringify(result));
} finally { memory.stop(); await provider.dispose(); }
