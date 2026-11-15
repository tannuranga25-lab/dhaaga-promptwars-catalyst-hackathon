import { describe, expect, it } from "vitest";
import {
  canClaimNotification,
  isWithinNotificationWindow,
  missedDoseGraceMilliseconds,
  missedDoseRecipients,
  nextNotificationClaim,
} from "./notification-policy";
import type { Contact } from "./schemas";

const contacts: Contact[] = [
  { name: "Elder", email: "elder@example.com", role: "elder", notifyMissed: true },
  { name: "Care", email: "care@example.com", role: "caretaker", notifyMissed: true },
  { name: "Family", email: "family@example.com", role: "family", notifyMissed: true },
];

describe("notification policy", () => {
  it("uses a single-minute upcoming window and computes critical grace", () => {
    const scheduledAt = 1_000_000;
    expect(isWithinNotificationWindow(scheduledAt, 15 * 60_000, scheduledAt - 15 * 60_000)).toBe(true);
    expect(isWithinNotificationWindow(scheduledAt, 15 * 60_000, scheduledAt - 14 * 60_000)).toBe(false);
    expect(missedDoseGraceMilliseconds(30, false)).toBe(30 * 60_000);
    expect(missedDoseGraceMilliseconds(30, true)).toBe(15 * 60_000);
    expect(missedDoseGraceMilliseconds(10, true)).toBe(10 * 60_000);
  });

  it("escalates critical dose recipients but never sends non-critical misses to family", () => {
    const missedAt = 1_000_000;
    const elderOptedOut = contacts.map((contact) => contact.role === "elder" ? { ...contact, notifyMissed: false } : contact);
    expect(missedDoseRecipients(contacts, false, missedAt, 10_000, missedAt + 30_000).map(({ role }) => role))
      .toEqual(["elder", "caretaker"]);
    expect(missedDoseRecipients(elderOptedOut, false, missedAt, 10_000, missedAt + 30_000).map(({ role }) => role))
      .toEqual(["elder", "caretaker"]);
    expect(missedDoseRecipients(contacts, true, missedAt, 10_000, missedAt + 20_000).map(({ role }) => role))
      .toEqual(["elder", "caretaker", "family"]);
  });

  it("claims notifications once, then allows at most two retries", () => {
    const first = nextNotificationClaim(undefined, 1000);
    expect(canClaimNotification(first, 1001)).toBe(false);
    expect(canClaimNotification(first, 61_000)).toBe(true);
    const third = { attempts: 3, claimedAt: 0 };
    expect(canClaimNotification(third, 100_000)).toBe(false);
    expect(canClaimNotification({ attempts: 1, claimedAt: 0, sentAt: 1 }, 100_000)).toBe(false);
  });
});
