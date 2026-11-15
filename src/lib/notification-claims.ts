import type { Firestore } from "@google-cloud/firestore";

const CLAIM_LEASE_MILLISECONDS = 5 * 60_000;

export async function claimNotification(
  db: Firestore,
  circleCode: string,
  notificationId: string,
  now: number,
): Promise<boolean> {
  const ref = db.collection("circles").doc(circleCode).collection("notifications").doc(notificationId);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const previous = snapshot.exists ? snapshot.data() : undefined;
    const attempts = typeof previous?.attempts === "number" ? previous.attempts : 0;
    const lastAttemptAt = typeof previous?.lastAttemptAt === "number" ? previous.lastAttemptAt : 0;
    if (previous?.status === "sent" || attempts >= 3) return false;
    if (previous?.status === "sending" && now - lastAttemptAt < CLAIM_LEASE_MILLISECONDS) return false;
    transaction.set(ref, {
      status: "sending",
      attempts: attempts + 1,
      lastAttemptAt: now,
      updatedAt: new Date(now).toISOString(),
    });
    return true;
  });
}

export async function finishNotification(
  db: Firestore,
  circleCode: string,
  notificationId: string,
  status: "sent" | "failed",
  now: number,
): Promise<void> {
  await db.collection("circles").doc(circleCode).collection("notifications").doc(notificationId).update({
    status,
    updatedAt: new Date(now).toISOString(),
  });
}
