export type ApprovalStatus = "pending" | "approved" | "rejected";
export type ApprovalDecision = "approve" | "reject";

export function approvalStatusAfterDecision(
  status: ApprovalStatus,
  decision: ApprovalDecision,
): Exclude<ApprovalStatus, "pending"> {
  if (status !== "pending") throw new Error("This change has already been reviewed.");
  return decision === "approve" ? "approved" : "rejected";
}
