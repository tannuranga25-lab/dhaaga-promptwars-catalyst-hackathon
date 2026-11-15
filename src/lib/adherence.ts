import type { DoseState } from "@/lib/schemas";

const terminalStates = new Set<DoseState>(["taken", "taken_late", "skipped", "missed"]);

export function computeAdherence(
  doses: ReadonlyArray<{ state: DoseState }>,
): { expected: number; taken: number; onTime: number; adherencePercent: number; onTimePercent: number } {
  const completed = doses.filter((dose) => terminalStates.has(dose.state));
  const expected = completed.length;
  const taken = completed.filter((dose) => dose.state === "taken" || dose.state === "taken_late").length;
  const onTime = completed.filter((dose) => dose.state === "taken").length;
  return {
    expected,
    taken,
    onTime,
    adherencePercent: expected === 0 ? 0 : Math.round((taken / expected) * 100),
    onTimePercent: expected === 0 ? 0 : Math.round((onTime / expected) * 100),
  };
}
