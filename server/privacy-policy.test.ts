import { createServer } from "node:http";
import { once } from "node:events";
import { expect, it, vi } from "vitest";
import { blockedPrivateRoute, createPrivacyPolicy, guardedFetch, ownerOrigins } from "./privacy-policy.ts";
import { assertPrivateConfig, privateInstances } from "./privacy-config.ts";

it("denies unknown, disguised and vendor destinations before handing data to a transport", async () => {
  const transport = vi.fn<typeof fetch>();
  const request = guardedFetch(createPrivacyPolicy(), transport);
  for (const url of ["https://us.i.posthog.com/capture", "https://backend.composio.dev/api", "https://evil.test/?private=secret", "https://chatgpt.com.evil.test", "https://chatgpt.com@evil.test", "http://chatgpt.com", "https://chatgpt.com:444", "https://10.71.0.10", "file:///tmp/private"]) {
    await expect(request(url, { method: "POST", body: "secret" })).rejects.toThrow("privacy policy");
  }
  expect(transport).not.toHaveBeenCalled();
  expect(() => ownerOrigins('["https://posthog.com"]')).toThrow();
  expect(() => ownerOrigins('["https://mine.test/path"]')).toThrow();
  expect(() => ownerOrigins('["https://*.mine.test"]')).toThrow();
});

it("accepts only explicit owner origins and approved model origins with exact ports", () => {
  const policy = createPrivacyPolicy(["https://10.70.0.20:8443"]);
  expect(() => policy.assertUrl("https://10.70.0.20:8443/mcp")).not.toThrow();
  expect(() => policy.assertUrl("https://10.70.0.20/mcp")).toThrow();
  expect(() => policy.assertUrl("wss://chatgpt.com/backend-api/codex")).not.toThrow();
  expect(() => policy.assertSocket("backend.composio.dev", 443)).toThrow();
  expect(() => policy.assertSocket("chatgpt.com", 443)).not.toThrow();
  expect(() => policy.assertSocket("chatgpt.com", 80)).toThrow();
});

it("refuses a redirect without forwarding the private payload to the next server", async () => {
  let received = 0;
  const target = createServer((_, res) => { received++; res.end("leak"); });
  target.listen(0, "127.0.0.1"); await once(target, "listening");
  const targetPort = (target.address() as { port: number }).port;
  const redirect = createServer((_, res) => { res.writeHead(307, { location: `http://127.0.0.1:${targetPort}/leak` }); res.end(); });
  redirect.listen(0, "127.0.0.1"); await once(redirect, "listening");
  try {
    const port = (redirect.address() as { port: number }).port;
    await expect(guardedFetch(createPrivacyPolicy(), fetch)(`http://127.0.0.1:${port}`, { method: "POST", body: "private" })).rejects.toThrow();
    expect(received).toBe(0);
  } finally {
    redirect.closeAllConnections(); target.closeAllConnections();
    await Promise.all([new Promise<void>(resolve => redirect.close(() => resolve())), new Promise<void>(resolve => target.close(() => resolve()))]);
  }
});

it("keeps Codex credentials private and refuses Hermes/hosted engines", () => {
  const instances = privateInstances({ codex: { driver: "codex", environment: { CODEX_HOME: "/home/atelier/.hermes/provider" } }, hermes: { driver: "hermesAgent" } }, "/private-dot");
  expect(Object.keys(instances)).toEqual(["codex"]);
  expect(instances.codex.environment?.CODEX_HOME?.replaceAll("\\", "/")).toMatch(/^\/private-dot\/providers\/codex\//);
  expect(() => assertPrivateConfig({ instances: { hermes: { driver: "hermesAgent" } } })).toThrow();
  expect(() => assertPrivateConfig({ composio: { apiKey: "must-not-send" } })).toThrow();
  expect(() => assertPrivateConfig({ box: { token: "must-not-send" } })).toThrow();
  expect(() => assertPrivateConfig({ profile: { name: "Local" }, features: { autoRecall: true } })).not.toThrow();
  expect(blockedPrivateRoute("/api/connectors/search")).toBe(true);
  expect(blockedPrivateRoute("/api/bots/test/memory")).toBe(false);
});
