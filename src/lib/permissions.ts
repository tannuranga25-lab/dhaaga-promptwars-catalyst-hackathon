import type { Role } from "@/lib/schemas";

export const actions = [
  "view",
  "logDose",
  "editMedications",
  "editAppointments",
  "manageCircle",
  "approveChanges",
  "viewAudit",
] as const;

export type Action = (typeof actions)[number];

const permissions: Record<Role, ReadonlySet<Action>> = {
  elder: new Set(actions),
  caretaker: new Set(["view", "logDose", "editMedications", "editAppointments", "viewAudit"]),
  family: new Set(["view"]),
};

export function can(role: Role, action: Action): boolean {
  return permissions[role].has(action);
}
