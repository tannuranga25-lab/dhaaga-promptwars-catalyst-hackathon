import { describe, expect, it } from "vitest";
import { secretsMatch } from "./secret-compare";

describe("secret comparison", () => {
  it("matches correct secrets without throwing on different lengths", () => {
    expect(secretsMatch("secret-value", "secret-value")).toBe(true);
    expect(secretsMatch("different", "secret-value")).toBe(false);
    expect(secretsMatch(null, "secret-value")).toBe(false);
    expect(secretsMatch("secret-value", undefined)).toBe(false);
  });
});
