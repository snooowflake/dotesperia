import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import * as boat from "./boat.ts";
import * as composio from "./composio.ts";
import { boatCredential, voiceCredential, deciderCredential, holdIncludedServices } from "./included-services.ts";
import { fleetAccess } from "./tunnel.ts";
import { fetchBotDirectory } from "./bot-directory.ts";

it("cannot reactivate vendor services even with credentials", async () => {
  const cfg = { box: { token: "synthetic-token" }, composio: { apiKey: "synthetic-key" } } as any;
  expect(boat.boatConfigured(cfg)).toBe(false);
  expect(composio.configured(cfg)).toBe(false);
  expect(boatCredential("synthetic-token")).toBeNull();
  expect(voiceCredential("synthetic-token")).toBeNull();
  expect(deciderCredential("synthetic-token", "http://127.0.0.1")).toBeNull();
  await expect(boat.runCommand(cfg, "synthetic-box", "echo test")).rejects.toMatchObject({ status: 403 });
  await expect(composio.authorizeService(cfg, "calendar")).rejects.toMatchObject({ status: 403 });
  await expect(fleetAccess({ credential: "synthetic-token" })).rejects.toMatchObject({ status: 403 });
  let fetched = false;
  await expect(fetchBotDirectory(async () => { fetched = true; return new Response(); })).rejects.toMatchObject({ status: 403 });
  expect(fetched).toBe(false);
  const env = { OMB_CLOUD_BOAT_TOKEN: "synthetic-token" };
  holdIncludedServices(env);
  expect(env).toEqual({});
});

it("contains no vendor request implementation or remote marketplace assets", () => {
  for (const file of ["boat.ts", "composio.ts", "included-services.ts", "tunnel.ts"]) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    expect(source).not.toMatch(/\bfetch\s*\(|\b(?:spawn|execFile|https\.request)\s*\(/);
  }
  const source = readFileSync(new URL("../src/components/PluginsPanel.tsx", import.meta.url), "utf8");
  expect(source).not.toContain("google.com");
  expect(source).not.toContain("/api/connectors");
});
