import type { DoseState } from "@/lib/schemas";

export type DoseAction = "markDue" | "taken" | "skipped" | "missed" | "snooze";
export type DoseTransition = {
  state: DoseState;
  confirmedAt?: string;
  snoozeUntil?: string;
  snoozeUsed?: boolean;
};

export function transitionDose(
  state: DoseState,
  action: DoseAction,
  now: Date,
  snoozeUsed = false,
): DoseTransition {
  const timestamp = now.toISOString();
  if (action === "markDue" && state === "scheduled") return { state: "due" };
  if (action === "taken" && state === "due") return { state: "taken", confirmedAt: timestamp };
  if (action === "taken" && state === "missed") return { state: "taken_late", confirmedAt: timestamp };
  if (action === "skipped" && state === "due") return { state: "skipped", confirmedAt: timestamp };
  if (action === "missed" && state === "due") return { state: "missed" };
  if (action === "snooze" && state === "due" && !snoozeUsed) {
    return {
      state: "due",
      snoozeUntil: new Date(now.getTime() + 15 * 60_000).toISOString(),
      snoozeUsed: true,
    };
  }
  throw new Error(`Cannot ${action} a dose in state ${state}.`);
}

export function canTransitionDose(state: DoseState, action: DoseAction, snoozeUsed = false): boolean {
  return (
    (action === "markDue" && state === "scheduled") ||
    (action === "taken" && (state === "due" || state === "missed")) ||
    (action === "skipped" && state === "due") ||
    (action === "missed" && state === "due") ||
    (action === "snooze" && state === "due" && !snoozeUsed)
  );
}
