import { describe, expect, it } from "vitest";
import { canTransitionDose, transitionDose } from "./dose";

describe("dose state machine", () => {
  it("enforces due, taken, skipped, missed, and late-taken transitions", () => {
    const now = new Date("2026-11-15T10:00:00.000Z");
    expect(transitionDose("scheduled", "markDue", now)).toEqual({ state: "due" });
    expect(transitionDose("due", "taken", now)).toMatchObject({ state: "taken", confirmedAt: now.toISOString() });
    expect(transitionDose("due", "skipped", now).state).toBe("skipped");
    expect(transitionDose("due", "missed", now).state).toBe("missed");
    expect(transitionDose("missed", "taken", now).state).toBe("taken_late");
  });

  it("rejects illegal transitions and allows only one snooze", () => {
    const now = new Date("2026-11-15T10:00:00.000Z");
    expect(canTransitionDose("scheduled", "taken")).toBe(false);
    expect(() => transitionDose("scheduled", "taken", now)).toThrow();
    expect(transitionDose("due", "snooze", now)).toMatchObject({
      state: "due",
      snoozeUntil: "2026-11-15T10:15:00.000Z",
      snoozeUsed: true,
    });
    expect(canTransitionDose("due", "snooze", true)).toBe(false);
  });
});
