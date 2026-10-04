// Dotesperia compatibility contracts. Vendor networking and provisioning

// implementations have been removed. Only owner-hosted MCP and native Codex

// inference are available in this fork. These adapters cannot be re-enabled.

import type { CompanionAccountService, CredentialDocument } from "../electron/companion-account-service.mjs";

import type { CompanionOriginEndpoint } from "../electron/companion-origin-gateway.mjs";

import type { ManagedTunnelAccess, ManagedTunnelState } from "../electron/managed-companion-tunnel.mjs";

export const TUNNEL_CREDENTIALS_FILE: string = "tunnel-account.json";

export const TUNNEL_RUNTIME_DIR: string = "tunnel-runtime";

export type { CompanionOriginEndpoint, ManagedTunnelAccess, ManagedTunnelState };

export interface TunnelCredentials {
    file: string;
    status: "ok" | "empty" | "unavailable";
    read(): CredentialDocument;
    update(derive: (current: CredentialDocument) => CredentialDocument, afterPersist?: (next: CredentialDocument) => Promise<void> | void): Promise<unknown>;
}

export function openTunnelCredentials(dataDir: string): TunnelCredentials {
  void dataDir;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export interface TunnelAccountSummary {
    email: string | null;
    address: string | null;
    installationId: string | null;
}

export function describeTunnelAccount(document: CredentialDocument): TunnelAccountSummary {
  void document;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export function tunnelAccess(document: CredentialDocument): ManagedTunnelAccess | null {
  void document;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export function platformName(platform?: NodeJS.Platform): "darwin" | "windows" | "linux" {
  void platform;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export interface TunnelAccount {
    service: CompanionAccountService;
    credentials: TunnelCredentials;
    controlPlane: string;
}

export interface TunnelRecovery {
    running(): RunningTunnel | null;
}

export function createTunnelAccount(options: {
    dataDir: string;
    version: string;
    env?: NodeJS.ProcessEnv;
    fetchImpl?: typeof fetch;
    machineName?: string;
    recovery?: TunnelRecovery;
    clock?: {
        setTimer: (callback: () => void, milliseconds: number) => unknown;
        clearTimer: (handle: unknown) => void;
        now: () => number;
    };
}): TunnelAccount {
  void options;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export const FLEET_CREDENTIAL_ENV: string = "OMB_INSTALLATION_CREDENTIAL";

export function fleetCredential(env?: NodeJS.ProcessEnv): string | null {
  void env;
  return null;
}

export async function fleetAccess(options: {
    credential: string;
    env?: NodeJS.ProcessEnv;
    fetchImpl?: typeof fetch;
}): Promise<ManagedTunnelAccess> {
  void options;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export function cloudflaredPath(dataDir: string, env?: NodeJS.ProcessEnv): string | null {
  void dataDir;
  void env;
  return null;
}

export function prepareEntry(here?: string): string {
  void here;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export function guardianEntry(here?: string): string | null {
  void here;
  return null;
}

export async function ensureCloudflared(options: {
    dataDir: string;
    env?: NodeJS.ProcessEnv;
    log: (line: string) => void;
    here?: string;
}): Promise<string> {
  void options;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export function createTunnelOrigin(): CompanionOriginEndpoint {

  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export function cleanupTunnelOrigin(origin: CompanionOriginEndpoint): void {
  void origin;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export interface RunningTunnel {
    address: string;
    state(): ManagedTunnelState;
    started: Promise<ManagedTunnelState>;
    restart(access: ManagedTunnelAccess): Promise<ManagedTunnelState>;
    stop(): Promise<void>;
}

export function startTunnel(options: {
    dataDir: string;
    access: ManagedTunnelAccess;
    originTarget: {
        pid: number;
        socketPath: string;
    };
    binaryPath: string;
    guardian: string;
    env?: NodeJS.ProcessEnv;
    fetchImpl?: typeof fetch;
    onState?: (state: ManagedTunnelState) => void;
}): RunningTunnel {
  void options;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export function describeTunnelState(state: ManagedTunnelState, address: string): string {
  void state;
  void address;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}
