import { describe, expect, it } from "vitest";
import { generateCircleCode, generatePasscode, hashPasscode, normalizeCircleCode, verifyPasscode } from "./crypto";

describe("passcode security helpers", () => {
  it("hashes and verifies passcodes without storing the original", async () => {
    const hash = await hashPasscode("729104");
    expect(hash).not.toContain("729104");
    await expect(verifyPasscode("729104", hash)).resolves.toBe(true);
    await expect(verifyPasscode("729105", hash)).resolves.toBe(false);
  });

  it("generates displayed circle codes in XXXX-XXXX format", () => {
    const code = generateCircleCode();
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    expect(normalizeCircleCode(code)).toHaveLength(8);
    expect(generatePasscode()).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
  });
});
