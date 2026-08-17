import { describe, expect, it } from "vitest";
import {
  normalizeStaffNotificationFilter,
  staffNotificationFilterLabel
} from "@/lib/operations-notifications";

describe("Operations notification filters", () => {
  it.each(["recent", "all", "unread", "read"] as const)("accepts the canonical %s view", (view) => {
    expect(normalizeStaffNotificationFilter(view)).toBe(view);
  });

  it("defaults unknown or repeated-query input to recent", () => {
    expect(normalizeStaffNotificationFilter("organization")).toBe("recent");
    expect(normalizeStaffNotificationFilter(["all"])).toBe("recent");
    expect(normalizeStaffNotificationFilter(null)).toBe("recent");
  });

  it("provides human labels for every view", () => {
    expect(staffNotificationFilterLabel("recent")).toBe("Recent");
    expect(staffNotificationFilterLabel("unread")).toBe("Unread");
  });
});
