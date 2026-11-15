import { describe, expect, it } from "vitest";
import { failuresAfterLockout, isLockedOut, LOCKOUT_MILLISECONDS, nextAuthAttempt } from "./lockout";

describe("passcode lockout logic", () => {
  it("locks for 15 minutes on the fifth failure", () => {
    const now = 100_000;
    let attempt = { failures: 0, lockedUntil: 0 };
    for (let count = 0; count < 5; count += 1) {
      attempt = nextAuthAttempt(attempt.failures, now);
    }
    expect(attempt).toEqual({ failures: 5, lockedUntil: now + LOCKOUT_MILLISECONDS });
    expect(isLockedOut(attempt.lockedUntil, now)).toBe(true);
    expect(isLockedOut(attempt.lockedUntil, now + LOCKOUT_MILLISECONDS)).toBe(false);
    expect(failuresAfterLockout(attempt.failures, attempt.lockedUntil, now + LOCKOUT_MILLISECONDS)).toBe(0);
  });
});
