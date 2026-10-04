// Native X11/MCP + bundled viewer, against the explicitly named disposable
// desktop service. No live Dotesperia conversation or provider token is used.
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchVerificationServer, type VerificationServer } from "./control-omb.ts";
import { fixtureApi } from "./testing/preview-fixture.ts";
import { ensureUiBrowser, sessionEnv, agentBrowser } from "./testing/control-omb-ui.ts";
import { RemoteMcpClient } from "../server/mcp-http.ts";

const env = Object.fromEntries(readFileSync("/opt/dotesperia/desktop/validation.env", "utf8").trim().split("\n").map(line => {
  const at = line.indexOf("="); return [line.slice(0, at), line.slice(at + 1)];
}));
assert.equal(env.HOME, "/home/dotesperia-desktop/validation");
assert.equal(env.DOTESPERIA_DESKTOP_PORT, "19002");
assert.equal(env.DOTESPERIA_DISPLAY, ":92");
const owned = { url: "http://127.0.0.1:19002", token: env.DOTESPERIA_DESKTOP_TOKEN, viewerPort: 19003 };
const client = new RemoteMcpClient({ type: "http", url: `${owned.url}/mcp`, headers: { authorization: `Bearer ${owned.token}` } });
const scratch = mkdtempSync(join(tmpdir(), "dotesperia-desktop-check-"));
let fixture: VerificationServer | undefined;
let browser: { binary: string; env: NodeJS.ProcessEnv } | undefined;
try {
  await client.initialize("dotesperia-verification", AbortSignal.timeout(8000));
  const catalog = await client.request("tools/list", {}, AbortSignal.timeout(8000)) as { tools: { name: string }[] };
  assert.ok(catalog.tools.some(tool => tool.name === "click"));
  assert.ok(!catalog.tools.some(tool => tool.name.includes("update") || tool.name === "config_set"));
  const screenshot = await client.request("tools/call", { name: "get_desktop_state", arguments: {} }, AbortSignal.timeout(20000)) as { content: { type: string; data?: string }[]; isError?: boolean };
  assert.equal(screenshot.isError, false);
  assert.ok(screenshot.content.some(item => item.type === "image" && item.data && item.data.length > 1000));
  assert.equal((await fetch(`${owned.url}/health`)).status, 403);
  fixture = await launchVerificationServer(process.env, undefined, undefined, undefined, undefined, undefined, [], undefined, owned);
  const api = fixtureApi(fixture.info.url);
  assert.equal((await api("GET", "/api/private-desktop/status")).ready, true);
  const pairing = await api("POST", "/api/auth/pairing", { scopes: ["admin", "client"] });
  const { binary, chrome } = await ensureUiBrowser(process.env);
  const childEnv = sessionEnv({ home: scratch, session: `private-desktop-${process.pid}`, chrome });
  browser = { binary, env: childEnv };
  const command = (...args: string[]) => agentBrowser(binary, childEnv, args);
  const evaluate = async (source: string) => (await command("eval", source)).result;
  await command("open", `${fixture.info.url}/desktop-viewer#target=private%2Faudit`);
  assert.equal(await evaluate(`(async () => (await fetch('/api/auth/pair',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code:${JSON.stringify(pairing.code)},cookie:true,label:'Private desktop fixture'})})).status)()`), 200);
  await command("wait", "--fn", "document.getElementById('retry') !== null");
  await command("click", "#retry");
  await command("wait", "--fn", "document.getElementById('status').textContent === 'Desktop connected'");
  assert.equal(await evaluate("document.querySelector('canvas').width"), 1280);
  assert.equal(await evaluate("document.querySelector('canvas').height"), 800);
  assert.equal(await evaluate("fetch('/api/auth/logout',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}).then(r=>r.status)"), 200);
  await command("wait", "--fn", "document.getElementById('status').textContent.includes('disconnected')");
  console.log(JSON.stringify({ nativeMcp: true, nativeScreenshot: true, authenticatedViewer: true, logoutRevokesViewer: true, syntheticDataOnly: true, toolCount: catalog.tools.length }));
} finally {
  if (browser) await agentBrowser(browser.binary, browser.env, ["close"]).catch(() => {});
  await client.close().catch(() => {});
  await fixture?.close();
  rmSync(scratch, { recursive: true, force: true });
}
