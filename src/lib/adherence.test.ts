import { describe, expect, it } from "vitest";
import { computeAdherence } from "./adherence";

describe("adherence calculations", () => {
  it("uses confirmed and missed events, excluding future doses", () => {
    expect(computeAdherence([
      { state: "taken" },
      { state: "taken_late" },
      { state: "skipped" },
      { state: "missed" },
      { state: "due" },
      { state: "scheduled" },
    ])).toEqual({
      expected: 4,
      taken: 2,
      onTime: 1,
      adherencePercent: 50,
      onTimePercent: 25,
    });
  });
});
