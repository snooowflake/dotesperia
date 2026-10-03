// Dotesperia compatibility contracts. Vendor networking and provisioning

// implementations have been removed. Only owner-hosted MCP and native Codex

// inference are available in this fork. These adapters cannot be re-enabled.

import type { AppConfig } from "./config.ts";

import type { ConnectorToolGrant } from "../shared/wire.ts";

type AuthConfigMap = Record<string, string>;

export interface ConnectedAccountSummary {
    id: string;
    alias?: string;
    status: string;
}

export interface ConnectorServiceState {
    connected: boolean;
    pending: boolean;
    status: string;
    accounts: ConnectedAccountSummary[];
}

type JsonValue = null | boolean | number | string | JsonValue[] | {
    [key: string]: JsonValue;
};

export interface ComposioMcpIntegration {
    command: string;
    args: string[];
    env: Record<string, string>;
}

interface IntegrationContext {
    harnessUrl: string;
    commsToken: string;
    botId: string;
    threadId: string;
    connectorTools?: Record<string, ConnectorToolGrant>;
}

export function applyManagedBrokerMessage(message: unknown): boolean {
  void message;
  return false;
}

export function setManagedBrokerAccess(access: unknown): void {
  void access;

}

export function connectionMode(cfg: AppConfig): "managed" | "self-hosted" | "unavailable" {
  void cfg;
  return "unavailable";
}

export function configured(cfg: AppConfig): boolean {
  void cfg;
  return false;
}

export type ConnectorAvailability = "configured" | "unconfigured" | "unreadable";

export function connectorAvailability(cfg: AppConfig, storeState?: string | undefined): ConnectorAvailability {
  void cfg;
  void storeState;
  return "unconfigured";
}

export type ConnectorSetup = "ready" | "needs-setup" | "service-unavailable";

export function connectorSetup(cfg: AppConfig, desktopManaged?: boolean): ConnectorSetup {
  void cfg;
  void desktopManaged;
  return "service-unavailable";
}

export function trustedSessionMcpUrl(value: string): boolean {
  void value;
  return false;
}

export function normalizeAccountAlias(value: string | null | undefined): string | undefined {
  void value;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export async function listCustomAuthConfigs(apiKey: string): Promise<AuthConfigMap> {
  void apiKey;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export async function prepareProjectSession(apiKey: string, current?: {
    apiKey?: string;
    userId?: string;
    sessionId?: string;
}, knownAuthConfigs?: AuthConfigMap): Promise<{
    apiKey: string;
    userId: string;
    sessionId: string;
}> {
  void apiKey;
  void current;
  void knownAuthConfigs;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export async function mcpIntegration(cfg: AppConfig, context: IntegrationContext): Promise<ComposioMcpIntegration | null> {
  void cfg;
  void context;
  return null;
}

export async function relayMcp(cfg: AppConfig, payload: JsonValue, transportSessionId?: string, beforeSend?: () => void): Promise<{
    status: number;
    bytes: Uint8Array;
    contentType: string;
    transportSessionId?: string;
}> {
  void cfg;
  void payload;
  void transportSessionId;
  void beforeSend;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export async function connectedServices(cfg: AppConfig): Promise<Record<string, ConnectorServiceState>> {
  void cfg;
  return {};
}

export async function validateConnectorGrants(cfg: AppConfig, grants: Record<string, ConnectorToolGrant>): Promise<string | null> {
  void cfg;
  void grants;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export interface ConnectorToolListing {
    name: string;
    description?: string;
}

export async function listConnectorTools(cfg: AppConfig, options?: {
    force?: boolean;
}): Promise<Record<string, ConnectorToolListing[]>> {
  void cfg;
  void options;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export async function connectedServiceSlugs(cfg: AppConfig): Promise<readonly string[]> {
  void cfg;
  return [];
}

export async function connectionStatus(cfg: AppConfig, slugs: string[]): Promise<Record<string, {
    connected: boolean;
    pending?: boolean | undefined;
    status?: string | undefined;
    accounts?: {
        id: string;
        status: string;
        alias?: string | undefined;
    }[] | undefined;
}>> {
  void cfg;
  void slugs;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export async function removeService(cfg: AppConfig, slug: string): Promise<{
    removed: number;
}> {
  void cfg;
  void slug;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export async function removeAccount(cfg: AppConfig, slug: string, accountId: string): Promise<{
    removed: number;
}> {
  void cfg;
  void slug;
  void accountId;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export async function authorizeService(cfg: AppConfig, slug: string, requestedAlias?: string | null): Promise<{
    url: string;
}> {
  void cfg;
  void slug;
  void requestedAlias;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export interface ToolkitCard {
    slug: string;
    label: string;
    blurb: string;
    logo: string | null;
    noAuth?: boolean;
    domain: string | null;
}

export type CatalogStopReason = "end" | "total-reached" | "page-stuck" | "cursor-repeated" | "http-error" | "bad-page" | "limit";

export interface CatalogPagination {
    items: number;
    totalItems?: number;
    stalled: boolean;
    reason?: CatalogStopReason;
    complete: boolean;
}

export async function listToolkits(cfg: AppConfig): Promise<{
    cards: ToolkitCard[];
    source: "api" | "curated";
    pagination?: CatalogPagination;
}> {
  void cfg;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export async function toolkitCard(cfg: AppConfig, slug: string): Promise<ToolkitCard> {
  void cfg;
  void slug;
  throw Object.assign(new Error("Service removed from the private fork"), {status: 403, code: "privacy_refusal"});
}

export const CURATED_SLUGS: string[] = [];

export {};
