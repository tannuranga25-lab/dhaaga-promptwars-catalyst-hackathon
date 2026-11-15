import type { Firestore } from "@google-cloud/firestore";
import type { Role } from "@/lib/schemas";

export async function writeAudit(
  db: Firestore,
  circleCode: string,
  actorRole: Role,
  action: string,
  targetId: string | undefined,
  source: "app" | "email-link" | "photo" = "app",
): Promise<void> {
  const record = {
    actorRole,
    action,
    source,
    details: {},
    createdAt: new Date().toISOString(),
  };
  await db.collection("circles").doc(circleCode).collection("audit").add(
    targetId ? { ...record, targetId } : record,
  );
}
