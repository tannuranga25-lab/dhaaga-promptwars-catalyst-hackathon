import { afterEach, describe, expect, it } from "vitest";
import { isCurrentPasscodeVersion, sessionCookieOptions, signSession, verifySession } from "./auth";

afterEach(() => {
  delete process.env.SESSION_SECRET;
});

describe("signed sessions", () => {
  it("signs and verifies role and passcode version claims", async () => {
    process.env.SESSION_SECRET = "a".repeat(32);
    const now = new Date("2026-01-01T00:00:00.000Z");
    const token = await signSession({
      circleCode: "ABCD2345",
      role: "caretaker",
      passcodeVersion: 3,
      now,
    });
    await expect(verifySession(token, now)).resolves.toEqual({
      circleCode: "ABCD2345",
      role: "caretaker",
      passcodeVersion: 3,
    });
    await expect(verifySession(`${token}x`, now)).rejects.toThrow();
  });

  it("invalidates sessions when the circle passcode version changes", () => {
    expect(isCurrentPasscodeVersion(2, 2)).toBe(true);
    expect(isCurrentPasscodeVersion(2, 3)).toBe(false);
  });

  it("sets the session cookie with the required browser protections", () => {
    expect(sessionCookieOptions()).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
  });
});
