// Compatibility helpers for existing bot settings. The vendor marketplace
// and remote icons have been removed from the private application.
import { type Bot, type InstanceInfo } from "@/state/store";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import type { LocaleKey } from "@/locales";
import { connectorServiceAccess, isConnectorToolGrantShape } from "@/lib/connector-grants";
import { PrivateAppsPanel } from "./PrivateAppsPanel";

export interface ToolkitCard {
  slug: string;
  label: string;
  blurb: string;
  logo: string | null;
  noAuth?: boolean;
  domain: string | null;
}

export interface ConnectorStatus {
  connected: boolean;
  pending?: boolean;
  status?: string;
  accounts?: Array<{
    id: string;
    alias?: string;
    status: string;
  }>;
}

export interface ConnectorInventory {
  services: Record<string, ConnectorStatus>;
  /** false when the server could not read the credential store: the list is
   * then "we do not know", and nothing may be cleared on the strength of it */
  authoritative: boolean;
}

/** Warm the account inventory once the app server is ready. Concurrent panel
 * opens share the same request, and recent data survives modal unmounts. */
export function preloadConnectedApps(_force = false): Promise<ConnectorInventory> {
  return Promise.resolve({ services: {}, authoritative: true });
}

export function disconnectAccountConfirmation(
  service: string,
  account: { id: string; alias?: string },
) {
  const identity = account.alias ? `“${account.alias}” (${account.id})` : `“${account.id}”`;
  return t("connectors.disconnectConfirm", { identity, service });
}

/** Bots that cannot see the workspace's connected apps because their own
 * per-bot grant is off. Connecting an app is only half of it: a bot a Chief
 * of Staff created, a package brought in, or a backup restored starts with
 * that grant off, and until it is on the bot is never told the tools exist
 * and reaches for a browser instead — with nothing on screen saying why.
 * Bots whose engine cannot mount the tools at all are left out, because
 * their switch is disabled: naming them would move the dead end, not end it.
 * Hidden bots are left out for the same reason — the person cannot act on
 * one from here. */
export function botsMissingConnectedApps(bots: Bot[], instances: InstanceInfo[]): Bot[] {
  return bots.filter((bot) =>
    !bot.hidden &&
    bot.composio === false &&
    instances.find((instance) => instance.instanceId === bot.modelSelection.instanceId)
      ?.capabilities?.composioMcp === true);
}

/** Bots whose connector tool grants limit this service below every tool —
 * a partial list, no entry at all inside an explicit record, or a grant
 * shape this build cannot read. Legacy bots (no grants record) have every
 * tool and never appear. Engines that cannot mount the tools and hidden
 * bots are left out: their editors are dead ends from here. */
export function botsWithLimitedServiceTools(bots: Bot[], instances: InstanceInfo[], slug: string): Bot[] {
  return bots.filter((bot) => {
    if (bot.hidden || bot.composio === false) return false;
    if (!instances.find((instance) => instance.instanceId === bot.modelSelection.instanceId)
      ?.capabilities?.composioMcp) return false;
    const record: unknown = bot.connectorTools;
    if (!record || typeof record !== "object" || Array.isArray(record)) return false;
    const grant = (record as Record<string, unknown>)[slug];
    if (grant === undefined) return true;
    return !isConnectorToolGrantShape(grant) || grant.tools !== "*";
  });
}

export function hasUsableConnectedApps(configured: boolean, phase: ConnectorInventoryPhase, stale: boolean, status: Record<string, ConnectorStatus>): boolean {
  return configured && phase === "ready" && !stale && Object.values(status).some((service) => service.connected);
}

/** What the host says about why connected apps are off (see
 * `connectorSetup` in server/composio.ts). Absent from older hosts. */
export type ConnectorSetup = "ready" | "needs-setup" | "service-unavailable";

/** The one notice above the marketplace when connected apps are off. A fresh
 * install that never had a connection service gets a calm "here is what to
 * do"; only a real outage of the managed service, or an older host that does
 * not say which it is, gets the warning. Two notices about the same fact is
 * one too many, so the stale banner wins when it is showing. */
export function connectorSetupNotice(state: {
  configured: boolean;
  stale: boolean;
  setup: ConnectorSetup | undefined;
  remoteClient: boolean;
}): { key: LocaleKey; tone: "info" | "warning" } | null {
  if (state.configured || state.stale) return null;
  if (state.setup === "needs-setup") {
    return { key: state.remoteClient ? "connectors.setupNeededRemote" : "connectors.setupNeeded", tone: "info" };
  }
  return { key: "connectors.notConfigured", tone: "warning" };
}

export function requiresAccountAlias(message: string) {
  return /account alias.*existing connection.*not replaced/i.test(message);
}

export type ConnectorInventoryPhase = "loading" | "ready" | "error";

export function connectorActionLabel(
  phase: ConnectorInventoryPhase,
  state: { busy: boolean; included: boolean; canContinue: boolean; pending?: boolean; hasAccounts: boolean; failed: boolean },
) {
  if (state.busy) return null;
  if (state.included) return t("connectors.action.included");
  if (phase === "loading") return t("connectors.action.checking");
  if (phase === "error") return t("connectors.action.unavailable");
  if (state.canContinue) return t("connectors.action.continue");
  if (state.pending) return t("connectors.action.checkStatus");
  if (state.hasAccounts) return t("connectors.action.addAccount");
  if (state.failed) return t("connectors.action.retry");
  return t("connectors.action.connect");
}

export function connectedInventoryCopy(phase: ConnectorInventoryPhase) {
  if (phase === "loading") return {
    title: t("connectors.empty.loadingTitle"),
    description: t("connectors.empty.loadingDesc"),
  };
  if (phase === "error") return {
    title: t("connectors.empty.errorTitle"),
    description: t("connectors.empty.errorDesc"),
  };
  return {
    title: t("connectors.empty.noneTitle"),
    description: t("connectors.empty.noneDesc"),
  };
}

export function mergeCurrentConnectorStatus(
  current: Record<string, ConnectorStatus>,
  incoming: Record<string, ConnectorStatus>,
  latestGenerations: ReadonlyMap<string, number>,
  requestGenerations: ReadonlyMap<string, number>,
) {
  const next = { ...current };
  for (const [slug, state] of Object.entries(incoming)) {
    if ((latestGenerations.get(slug) ?? 0) !== (requestGenerations.get(slug) ?? 0)) continue;
    next[slug] = state;
  }
  return next;
}

export function mergeCompleteConnectorStatus(
  current: Record<string, ConnectorStatus>,
  incoming: Record<string, ConnectorStatus>,
  latestGenerations: ReadonlyMap<string, number>,
  requestGenerations: ReadonlyMap<string, number>,
  /** Did the server actually KNOW the full picture? A response sent while the
   * credential store was unreadable carries no information about what is
   * connected, so it must not be allowed to clear anything — an empty list
   * from an ignorant server is exactly how a connected app became a Connect
   * button. Disconnection still shows up on the next authoritative answer. */
  authoritative = true,
) {
  const next = { ...current };
  if (!authoritative) return mergeCurrentConnectorStatus(next, incoming, latestGenerations, requestGenerations);
  for (const [slug, state] of Object.entries(current)) {
    if (incoming[slug]) continue;
    if (!state.connected && !state.accounts?.length) continue;
    if ((latestGenerations.get(slug) ?? 0) !== (requestGenerations.get(slug) ?? 0)) continue;
    next[slug] = { connected: false, pending: false, status: "not_connected", accounts: [] };
  }
  return mergeCurrentConnectorStatus(next, incoming, latestGenerations, requestGenerations);
}

export function onlyLatestConnectorResponses(
  incoming: Record<string, ConnectorStatus>,
  latestRequests: ReadonlyMap<string, number>,
  requestIds: ReadonlyMap<string, number>,
) {
  return Object.fromEntries(
    Object.entries(incoming).filter(
      ([slug]) => (latestRequests.get(slug) ?? 0) === (requestIds.get(slug) ?? 0),
    ),
  );
}

/** A toolkit's mark: official logo, else favicon by domain, else monogram.
 * Shared with the onboarding connectors scene so both show the same logos. */
export function ServiceIcon({ card, className = "size-11" }: { card: Pick<ToolkitCard, "logo" | "domain" | "label">; className?: string }) {
  return <div className={cn("flex items-center justify-center rounded-xl bg-raised text-[15px] font-semibold text-ink-secondary", className)}>{card.label.slice(0, 1).toUpperCase()}</div>;
}

/** Legacy catalog compatibility shape. Absent
 * totalItems means upstream never stated a total, so there is nothing to
 * compare the served cards against. */
export interface CatalogPagination {
  items: number;
  totalItems?: number;
  stalled: boolean;
  /** Server-side stop reason, present only when the walk stalled (#1838). */
  reason?: string;
}

/** The Apps pop-up's chips: every app, only the connected ones, or only
 * your own MCP servers. "mcp" is the store's `pluginsSurface`, so a bot's
 * Tools page can still send someone straight to their servers. */
export type AppsFilter = "all" | "connected" | "mcp";

/** Without a search, the "All" grid shows this many tiles before a
 * "Show all" button. */
export const APPS_PREVIEW_COUNT = 48;

/** A "used by" bot avatar, drawn inside its 20px ring (size-5). The farthest
 * any mascot body reaches from the centre is 0.55 of its box (the shield; a
 * cursor's tip is 0.54), so at 16px every shape stays a pixel clear of the
 * circle's edge. */
export const USED_BY_AVATAR_SIZE = 16;

/** Bots that can use this service's tools today: visible, connected apps
 * on, an engine that mounts them, and a grant that includes the service
 * (no record at all is the legacy every-tool default). */
export function botsUsingService(bots: Bot[], instances: InstanceInfo[], slug: string): Bot[] {
  return bots.filter((bot) =>
    !bot.hidden &&
    bot.composio !== false &&
    instances.find((instance) => instance.instanceId === bot.modelSelection.instanceId)
      ?.capabilities?.composioMcp === true &&
    connectorServiceAccess(bot.connectorTools, slug).level !== "none");
}

export function PluginsPanel() { return <PrivateAppsPanel />; }
