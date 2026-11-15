import { describe, expect, it } from "vitest";
import { generateDoseOccurrences } from "./schedule";
import type { Medication } from "./schemas";

const medication: Medication = {
  name: "Example medicine",
  strength: "10 mg",
  form: "tablet",
  instructions: "With water",
  times: ["08:30", "20:30"],
  daysOfWeek: [1, 3, 5],
  startDate: "2026-11-01",
  critical: false,
  paused: false,
};

describe("dose schedule generation", () => {
  it("generates stable ids and converts local schedule times to UTC", () => {
    const first = generateDoseOccurrences("med-1", medication, "2026-11-09", "2026-11-10", "Asia/Kolkata");
    const repeated = generateDoseOccurrences("med-1", medication, "2026-11-09", "2026-11-10", "Asia/Kolkata");
    expect(first).toHaveLength(2);
    expect(first).toEqual(repeated);
    expect(first[0]).toMatchObject({
      id: "2026-11-09_08-30_med-1",
      scheduledAt: "2026-11-09T03:00:00.000Z",
    });
  });

  it("excludes paused and out-of-range days", () => {
    expect(generateDoseOccurrences("med-1", { ...medication, paused: true }, "2026-11-09", "2026-11-10", "UTC")).toEqual([]);
    expect(generateDoseOccurrences("med-1", medication, "2026-11-10", "2026-11-10", "UTC")).toEqual([]);
  });

  it("rejects a local time that is skipped by a daylight-saving transition", () => {
    expect(() => generateDoseOccurrences(
      "med-1",
      { ...medication, times: ["02:30"], daysOfWeek: [0], startDate: "2026-01-01" },
      "2026-03-08",
      "2026-03-08",
      "America/New_York",
    )).toThrow(RangeError);
  });
});
