// A live native-provider check in disposable Dotesperia data. Auth is copied
// only from Dotesperia's own account, stays owner-only, and is deleted below.
import "../server/privacy-boot.ts";
import assert from "node:assert/strict";
import { copyFileSync, chmodSync, existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { DATA_DIR } from "../server/config.ts";
import { CodexDriver } from "../server/drivers/codex.ts";
import { recordEvents } from "../server/testing/events.ts";

const source = process.env.DOTESPERIA_VERIFY_CODEX_HOME;
assert.ok(DATA_DIR.startsWith("/home/dotesperia/validation-desktop-"));
assert.ok(source && realpathSync(source).startsWith("/home/dotesperia/.dotesperia/providers/codex/"));
const fixture = JSON.parse(readFileSync(join(DATA_DIR, "desktop-fixture.json"), "utf8"));
assert.equal(fixture.url, "http://127.0.0.1:19002/mcp");
assert.match(fixture.token, /^[a-f0-9]{64}$/);
const credentialHome = join(DATA_DIR, "own-codex-login");
assert.equal(existsSync(credentialHome), false);
mkdirSync(credentialHome, { mode: 0o700 });
copyFileSync(join(source!, "auth.json"), join(credentialHome, "auth.json"));
chmodSync(join(credentialHome, "auth.json"), 0o600);
writeFileSync(join(credentialHome, "config.toml"), 'model="gpt-6-astra"\nweb_search="disabled"\n[analytics]\nenabled=false\n[feedback]\nenabled=false\n[otel]\nexporter="none"\ntrace_exporter="none"\nmetrics_exporter="none"\nlog_user_prompt=false\n[features]\nshell_tool=false\nunified_exec=false\nview_image=false\nshell_snapshot=false\n', { mode: 0o600 });
const provider = await CodexDriver.create({
  instanceId: "synthetic-desktop-check", displayName: "Synthetic desktop check", enabled: true,
  config: CodexDriver.decodeConfig({ cli: "/opt/dotesperia/tooling/node_modules/.bin/codex" }),
  environment: { CODEX_HOME: credentialHome },
});
const recorded = recordEvents(provider.adapter);
try {
  assert.equal((await provider.snapshot()).authenticated, true);
  const threadId = randomUUID();
  const result = await provider.adapter.sendTurn({
    threadId, botId: randomUUID(), cwd: DATA_DIR, model: "gpt-6-astra", effort: "low", approvalMode: "full",
    toolScope: { allow: ["native:*", "mcp:private_desktop:get_desktop_state"] },
    integrations: { custom: { private_desktop: { type: "http", url: fixture.url, headers: { Authorization: `Bearer ${fixture.token}` } } } },
    text: "Use the private_desktop get_desktop_state MCP tool exactly once. Read the synthetic marker in the Mousepad editor on the screenshot and return only that marker. Do not use other tools or modify anything.",
  });
  const done = await recorded.until(event => event.type === "turn.completed" && event.turnId === result.turnId, 120000);
  if (!("ok" in done && done.ok)) console.log(JSON.stringify({ eventTypes: [...new Set(recorded.events.map(event => event.type))], errors: recorded.events.filter(event => event.type === "runtime.error").map(event => "message" in event ? event.message.replaceAll(fixture.token, "[redacted]").slice(0,500) : "") }));
  assert.ok("ok" in done && done.ok);
  const toolEvents = recorded.events.filter(event => ["item.started", "item.completed"].includes(event.type)) as any[];
  const types = [...new Set(recorded.events.map(event => event.type))];
  const output = recorded.events.filter(event => event.type === "content.delta" && event.streamKind === "assistant_text")
    .map(event => "delta" in event ? event.delta : "").join("");
  assert.ok(output.includes("DOTESPERIA_VALIDATION_20261004"), "Native model did not read the synthetic screenshot marker");
  assert.ok(toolEvents.some(event => JSON.stringify(event).includes("get_desktop_state")), "No native MCP tool receipt");
  console.log(JSON.stringify({ nativeCodex: true, nativeMcpScreenshot: true, markerRead: true, syntheticDataOnly: true, sourceLogin: "Dotesperia only", eventTypes: types }));
} finally {
  recorded.stop(); await provider.dispose(); rmSync(credentialHome, { recursive: true, force: true });
}
