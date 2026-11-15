import { describe, expect, it } from "vitest";
import { localDateAt } from "./time";

describe("circle-local calendar dates", () => {
  it("uses the circle timezone rather than the server's UTC date", () => {
    const instant = new Date("2026-11-15T20:00:00.000Z");
    expect(localDateAt(instant, "Asia/Kolkata")).toBe("2026-11-16");
    expect(localDateAt(instant, "America/New_York")).toBe("2026-11-15");
  });
});
