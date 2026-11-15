import { describe, expect, it } from "vitest";
import { approvalStatusAfterDecision } from "./approval";

describe("approval decisions", () => {
  it("resolves pending changes once", () => {
    expect(approvalStatusAfterDecision("pending", "approve")).toBe("approved");
    expect(approvalStatusAfterDecision("pending", "reject")).toBe("rejected");
    expect(() => approvalStatusAfterDecision("approved", "reject")).toThrow();
  });
});
