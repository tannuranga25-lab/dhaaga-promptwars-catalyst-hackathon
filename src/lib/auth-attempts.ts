import { createHash } from "node:crypto";
import { authAttemptSchema } from "@/lib/schemas";
import { getFirestore } from "@/lib/db";
import { failuresAfterLockout, isLockedOut, nextAuthAttempt } from "@/lib/lockout";

function attemptDocumentId(circleCode: string, ipAddress: string): string {
  return createHash("sha256").update(`${circleCode}:${ipAddress}`).digest("hex");
}

export async function lockedOut(circleCode: string, ipAddress: string, now = Date.now()): Promise<boolean> {
  const ref = getFirestore()
    .collection("circles")
    .doc(circleCode)
    .collection("authAttempts")
    .doc(attemptDocumentId(circleCode, ipAddress));
  const snapshot = await ref.get();
  if (!snapshot.exists) return false;
  const attempt = authAttemptSchema.parse(snapshot.data());
  return isLockedOut(attempt.lockedUntil, now);
}

export async function recordAuthFailure(
  circleCode: string,
  ipAddress: string,
  now = Date.now(),
): Promise<void> {
  const ref = getFirestore()
    .collection("circles")
    .doc(circleCode)
    .collection("authAttempts")
    .doc(attemptDocumentId(circleCode, ipAddress));
  await getFirestore().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const previous = snapshot.exists
      ? authAttemptSchema.parse(snapshot.data())
      : { failures: 0, lockedUntil: 0, updatedAt: new Date(now).toISOString() };
    const next = nextAuthAttempt(failuresAfterLockout(previous.failures, previous.lockedUntil, now), now);
    transaction.set(ref, { ...next, updatedAt: new Date(now).toISOString() });
  });
}

export async function clearAuthFailures(circleCode: string, ipAddress: string): Promise<void> {
  const ref = getFirestore()
    .collection("circles")
    .doc(circleCode)
    .collection("authAttempts")
    .doc(attemptDocumentId(circleCode, ipAddress));
  await ref.delete();
}

export function requestIpAddress(forwardedFor: string | null, realIp: string | null): string {
  const forwarded = forwardedFor?.split(",").map((value) => value.trim()).filter(Boolean);
  return (forwarded?.at(-1) || realIp || "unknown").slice(0, 100);
}
