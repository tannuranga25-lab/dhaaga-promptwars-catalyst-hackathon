import { NextResponse } from "next/server";
import { z } from "zod";
import { approvalStatusAfterDecision } from "@/lib/approval";
import { hasValidOrigin } from "@/lib/csrf";
import { getFirestore } from "@/lib/db";
import { getApiSession } from "@/lib/require-session";
import { medicationSchema, medicationUpdateSchema, pendingChangeSchema } from "@/lib/schemas";

const inputSchema = z.object({ decision: z.enum(["approve", "reject"]) });
const idSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);

export async function GET() {
  const { session, status } = await getApiSession("approveChanges");
  if (!session) return NextResponse.json({ error: "Only the elder can review changes." }, { status });
  const snapshot = await getFirestore().collection("circles").doc(session.circleCode)
    .collection("pendingChanges").where("status", "==", "pending").limit(50).get();
  return NextResponse.json({
    changes: snapshot.docs.map((document) => ({ id: document.id, ...document.data() })),
  });
}

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) {
    return NextResponse.json({ error: "This request could not be verified." }, { status: 403 });
  }
  const { session, status } = await getApiSession("approveChanges");
  if (!session) return NextResponse.json({ error: "Only the elder can review changes." }, { status });
  const body = inputSchema.safeParse(await request.json().catch(() => null));
  const id = idSchema.safeParse(new URL(request.url).searchParams.get("id"));
  if (!body.success || !id.success) return NextResponse.json({ error: "Choose a valid change decision." }, { status: 400 });

  const db = getFirestore();
  const circle = db.collection("circles").doc(session.circleCode);
  const changeRef = circle.collection("pendingChanges").doc(id.data);
  const medicationCollection = circle.collection("medications");
  try {
    const outcome = await db.runTransaction(async (transaction) => {
      const changeSnapshot = await transaction.get(changeRef);
      if (!changeSnapshot.exists) return "not-found";
      const change = pendingChangeSchema.parse(changeSnapshot.data());
      const nextStatus = approvalStatusAfterDecision(change.status, body.data.decision);
      const now = new Date().toISOString();
      if (nextStatus === "approved") {
        if (change.type === "create" && change.payload) {
          const medication = medicationSchema.parse(change.payload);
          const medicationRef = medicationCollection.doc();
          transaction.create(medicationRef, { ...medication, createdAt: now });
        } else if (change.type === "update" && change.medicationId && change.patch) {
          const patch = medicationUpdateSchema.parse(change.patch);
          transaction.update(medicationCollection.doc(change.medicationId), { ...patch, updatedAt: now });
        } else if (change.type === "delete" && change.medicationId) {
          transaction.delete(medicationCollection.doc(change.medicationId));
        } else {
          throw new Error("Pending change data is incomplete.");
        }
      }
      transaction.update(changeRef, {
        status: nextStatus,
        reviewedBy: session.role,
        reviewedAt: now,
      });
      transaction.set(circle.collection("audit").doc(), {
        actorRole: session.role,
        action: `medication.change_${body.data.decision}d`,
        source: "app",
        targetId: change.medicationId ?? changeRef.id,
        details: { requestedBy: change.requestedBy, approvedBy: session.role },
        createdAt: now,
      });
      return nextStatus;
    });
    if (outcome === "not-found") return NextResponse.json({ error: "Change not found." }, { status: 404 });
    return NextResponse.json({ status: outcome });
  } catch (error) {
    if (error instanceof Error && error.message === "This change has already been reviewed.") {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
