// Dotesperia compatibility contracts. Vendor networking and provisioning

// implementations have been removed. Only owner-hosted MCP and native Codex

// inference are available in this fork. These adapters cannot be re-enabled.

import type { AppConfig } from "./config.ts";

import type { ServiceCredential } from "./included-services.ts";

export const MAX_REMOTE_COMMAND_LENGTH: number = 4000;

export function isolatedRemoteCommand(command: string): string {
  void command;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export interface ManagedBoatOwner {
    botId: string;
    name: string;
    inUse: boolean;
}

export interface ManagedBoatInventoryInstance {
    boxId: string;
    name: string;
    state: string;
    ownerBotId: string | null;
    ownerName: string | null;
    orphaned: boolean;
    inUse: boolean;
}

export interface ManagedBoatInventory {
    configured: boolean;
    available: boolean;
    problem: string | null;
    credentialRejected?: boolean;
    instances: ManagedBoatInventoryInstance[];
}

export interface BoatIdentityInspection {
    available: boolean;
    identity: {
        boxId: string;
        name: string;
        state: string;
    } | null;
    problem: string | null;
}

export type BoatTurnLifecycleAction = "attach" | "provision" | "wake" | "none";

export function boatTurnLifecycleAction({ explicitCloud, canMount, state, }: {
    explicitCloud: boolean;
    canMount: boolean;
    state: string | null;
}): BoatTurnLifecycleAction {
  void explicitCloud;
  void canMount;
  void state;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export type ManagedBoatMutationClaim = (instance: ManagedBoatInventoryInstance) => (() => void) | void;

export async function verifyBoatDeletionCredential(cfg: AppConfig): Promise<void> {
  void cfg;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export async function boatNameFor(botId: string): Promise<string> {
  void botId;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export async function boatNameMatchesBot(botId: string, name: string): Promise<boolean> {
  void botId;
  void name;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export async function runCommand(cfg: AppConfig, boxId: string, command: string, { timeoutMs, signal }: {
    timeoutMs?: number;
    signal?: AbortSignal;
} = {}): Promise<{
    ok: boolean;
    exitCode: any;
    stdout: any;
    stderr: any;
}> {
  void cfg;
  void boxId;
  void command;
  void timeoutMs;
  void signal;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export async function listManagedBoats(cfg: AppConfig, owners: ManagedBoatOwner[], options?: {
    adoptLegacy?: boolean;
}): Promise<ManagedBoatInventory> {
  void cfg;
  void owners;
  void options;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export async function inspectBoatIdentity(cfg: AppConfig, boxId: string): Promise<BoatIdentityInspection> {
  void cfg;
  void boxId;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export async function sleepManagedBoat(cfg: AppConfig, owners: ManagedBoatOwner[], boxId: string, claim?: ManagedBoatMutationClaim): Promise<{
    ok: boolean;
}> {
  void cfg;
  void owners;
  void boxId;
  void claim;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export async function deleteManagedBoat(cfg: AppConfig, owners: ManagedBoatOwner[], boxId: string, confirmName: string, claim?: ManagedBoatMutationClaim, options?: {
    pollDelaysMs?: readonly number[];
}): Promise<{
    ok: boolean;
    pending?: undefined;
} | {
    ok: boolean;
    pending: true;
}> {
  void cfg;
  void owners;
  void boxId;
  void confirmName;
  void claim;
  void options;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export async function findBoat(cfg: AppConfig, botId: string): Promise<any> {
  void cfg;
  void botId;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export async function readyBoat(cfg: AppConfig, botId: string, budgetMs?: number): Promise<any> {
  void cfg;
  void botId;
  void budgetMs;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export function boatAccount(cfg: AppConfig): ServiceCredential | null {
  void cfg;
  return null;
}

export function boatConfigured(cfg: AppConfig): boolean {
  void cfg;
  return false;
}

export function describeBoatAccount(cfg: AppConfig): {
    configured: boolean;
    included?: true;
} {
  void cfg;
  return { configured: false };
}

export async function verifyToken(token: string): Promise<{
    ok: true;
} | {
    ok: false;
    message: string;
}> {
  void token;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export function boatErrorMessage(status: number, what: string, body?: any, included?: boolean): string {
  void status;
  void what;
  void body;
  void included;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export function boatCredentialEnv(cfg: AppConfig, env?: NodeJS.ProcessEnv): Record<string, string> {
  void cfg;
  void env;
  return {};
}

export async function boatStatus(cfg: AppConfig, botId: string): Promise<{
    configured: boolean;
    box: {
        boxId: any;
        state: any;
        desktopAvailable: any;
    } | null;
}> {
  void cfg;
  void botId;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export async function provisionBoat(cfg: AppConfig, botId: string, _botName: string): Promise<{
    boxId: any;
    machineName: string;
    reused: boolean;
    state: any;
    joinUrl: any;
}> {
  void cfg;
  void botId;
  void _botName;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export async function joinBoat(cfg: AppConfig, botId: string): Promise<{
    joinUrl: any;
    state: any;
}> {
  void cfg;
  void botId;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export async function joinReadyBoat(cfg: AppConfig, botId: string): Promise<{
    joinUrl: any;
    state: any;
}> {
  void cfg;
  void botId;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export async function sleepBoat(cfg: AppConfig, botId: string): Promise<{
    ok: boolean;
}> {
  void cfg;
  void botId;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export async function execOnBoat(cfg: AppConfig, botId: string, command: string): Promise<{
    exitCode: any;
    stdout: any;
    stderr: any;
}> {
  void cfg;
  void botId;
  void command;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export const PANEL_FRAME_WIDTH: number = 1920;

export const PANEL_FRAME_QUALITY: number = 85;

export function panelShotCommand({ width, quality, framePath, nativeSize }: {
    width?: number | undefined;
    quality?: number | undefined;
    framePath?: string | undefined;
    nativeSize?: boolean | undefined;
} = {}): string {
  void width;
  void quality;
  void framePath;
  void nativeSize;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export async function screenshotBoat(cfg: AppConfig, botId: string, knownBoatId?: string, options?: {
    signal?: AbortSignal;
    nativeSize?: boolean;
}): Promise<{
    png: string;
    format: string;
}> {
  void cfg;
  void botId;
  void knownBoatId;
  void options;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}
