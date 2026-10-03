import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { InstanceConfigMap } from "./contracts.ts";

const fakeClaude = fileURLToPath(new URL("./testing/fake-claude-cli.ts", import.meta.url));
function offlineFixture(entry: InstanceConfigMap[string]): boolean {
  const config = entry.config as { cli?: unknown } | undefined;
  return entry.driver === "claudeAgent" && typeof config?.cli === "string" && resolve(config.cli) === resolve(fakeClaude);
}
const nonempty = (value: unknown): boolean => {
  if (value && typeof value === "object") return Object.values(value).some(nonempty);
  return value !== undefined && value !== null && value !== "" && value !== false;
};
const FORBIDDEN_CONFIG = ["composio", "box", "xai", "anthropic", "openai", "openrouter", "openaiCompat", "opencodeGo", "mistral", "cerebras", "tts", "decider", "signIn", "live", "imageGen"];

export function assertPrivateConfig(config: object): void {
  const record = config as Record<string, unknown>;
  for (const key of FORBIDDEN_CONFIG) {
    if (nonempty(record[key])) throw new Error(`Dotesperia privacy profile does not support ${key}. Use Codex login or an owner-hosted MCP service.`);
  }
  const features = record.features as Record<string, unknown> | undefined;
  if (features?.cloudOverflow === true || features?.sharedComputers === true) throw new Error("Hosted computers and computer lending are disabled in this fork.");
  const instances = record.instances as InstanceConfigMap | undefined;
  for (const entry of Object.values(instances || {})) {
    if (entry.driver !== "codex" && !offlineFixture(entry)) throw new Error("Only native Codex and the repository's offline verification engine are allowed.");
    const settings = entry.config as { authMode?: string; managed?: unknown } | undefined;
    if (settings?.managed || settings?.authMode === "chatgpt-plan") throw new Error("Use native Codex sign-in with a separate credential home.");
  }
}

export function privateInstances(map: InstanceConfigMap, dataDir: string): InstanceConfigMap {
  const entries = Object.entries(map).filter(([, entry]) => entry.driver === "codex" && (entry.config as { authMode?: string } | undefined)?.authMode !== "chatgpt-plan" || offlineFixture(entry));
  return Object.fromEntries(entries.map(([id, entry]) => [id, {
    ...entry,
    environment: {
      ...entry.environment,
      ...(entry.driver === "codex" ? { CODEX_HOME: join(dataDir, "providers", "codex", createHash("sha256").update(id).digest("hex")) } : {}),
    },
  }]));
}
