import { afterEach, expect, it, vi } from "vitest";
import { analyticsEnabled, initAnalytics, identifyEmail, optAction, setAnalyticsEnabled, track } from "./analytics";

afterEach(() => vi.unstubAllGlobals());
it("never enables collection, including with an old opt-in or unavailable storage", () => {
  const fetch = vi.fn(() => { throw new Error("Unexpected network access"); });
  const storage = { getItem: vi.fn(() => { throw new Error("Unavailable"); }), setItem: vi.fn() };
  vi.stubGlobal("fetch", fetch);
  vi.stubGlobal("localStorage", storage);
  setAnalyticsEnabled(true);
  initAnalytics();
  identifyEmail("private@example.test");
  track("private", { conversation: "must stay here" });
  expect(analyticsEnabled()).toBe(false);
  expect(optAction(true, true)).toBe("none");
  expect(fetch).not.toHaveBeenCalled();
  expect(storage.getItem).not.toHaveBeenCalled();
  expect(storage.setItem).not.toHaveBeenCalled();
});
