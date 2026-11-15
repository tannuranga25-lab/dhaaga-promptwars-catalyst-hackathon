import { afterEach, describe, expect, it } from "vitest";
import { signSession, verifySession } from "./auth";

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
});
