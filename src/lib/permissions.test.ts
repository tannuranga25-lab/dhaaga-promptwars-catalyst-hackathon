import { describe, expect, it } from "vitest";
import { actions, can } from "./permissions";

describe("care-circle permissions", () => {
  it("grants every action to the elder", () => {
    for (const action of actions) expect(can("elder", action)).toBe(true);
  });

  it("limits caretakers and family to their assigned actions", () => {
    expect(can("caretaker", "logDose")).toBe(true);
    expect(can("caretaker", "manageCircle")).toBe(false);
    expect(can("family", "view")).toBe(true);
    expect(can("family", "viewAudit")).toBe(false);
  });
});
