// Compatibility for existing UI calls. This fork contains no analytics client,
// identity, queue or destination, even if old preferences opted in.
export function analyticsEnabled(): boolean { return false; }
export type OptAction = "none";
export function optAction(_enabled: boolean, _running: boolean): OptAction { return "none"; }
export function setAnalyticsEnabled(_enabled: boolean): void {}
export function initAnalytics(): void {}
export function track(_event: string, _props?: Record<string, unknown>): void {}
export function identifyEmail(_email: string): void {}

// Local welcome completion, independent of an email address.
const GATE_KEY = "dotesperia-welcome";
export function emailGateDone(): boolean {
  try { return Boolean(localStorage.getItem(GATE_KEY)); } catch { return false; }
}
export function setEmailGateDone(_status: "submitted" | "skipped"): void {
  try { localStorage.setItem(GATE_KEY, "done"); } catch { /* optional preference */ }
}
