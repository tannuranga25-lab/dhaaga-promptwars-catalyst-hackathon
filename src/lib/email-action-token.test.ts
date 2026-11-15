import { afterEach, describe, expect, it } from "vitest";
import { createEmailActionToken, EMAIL_ACTION_TTL_SECONDS, verifyEmailActionToken } from "./email-action-token";

afterEach(() => {
  delete process.env.EMAIL_ACTION_SECRET;
});

describe("email action tokens", () => {
  it("signs a dose action for 24 hours and rejects tampering", () => {
    process.env.EMAIL_ACTION_SECRET = "x".repeat(32);
    const now = 1_800_000_000_000;
    const token = createEmailActionToken("ABCD2345", "2026-11-15_08-00_med1", "taken", now);
    expect(verifyEmailActionToken(token, now)).toEqual({
      circleCode: "ABCD2345",
      doseId: "2026-11-15_08-00_med1",
      action: "taken",
      expiresAt: Math.floor(now / 1000) + EMAIL_ACTION_TTL_SECONDS,
    });
    expect(() => verifyEmailActionToken(`${token}x`, now)).toThrow();
  });

  it("rejects expired links", () => {
    process.env.EMAIL_ACTION_SECRET = "x".repeat(32);
    const now = 1_800_000_000_000;
    const token = createEmailActionToken("ABCD2345", "dose-1", "skipped", now);
    expect(() => verifyEmailActionToken(token, now + EMAIL_ACTION_TTL_SECONDS * 1000)).toThrow(/expired/i);
  });
});
