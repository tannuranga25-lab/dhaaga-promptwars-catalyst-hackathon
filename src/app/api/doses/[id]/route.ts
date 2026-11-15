import { NextResponse } from "next/server";
import { z } from "zod";
import { hasValidOrigin } from "@/lib/csrf";
import { transitionDose } from "@/lib/dose";
import { doseActionSchema, doseSchema } from "@/lib/schemas";
import { getFirestore } from "@/lib/db";
import { getApiSession } from "@/lib/require-session";

const idSchema = z.string().regex(/^[A-Za-z0-9_-]{1,180}$/);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!hasValidOrigin(request)) {
    return NextResponse.json({ error: "This request could not be verified." }, { status: 403 });
  }
  const { session, status } = await getApiSession("logDose");
  if (!session) return NextResponse.json({ error: "You cannot record dose activity in this circle." }, { status });
  const id = idSchema.safeParse((await context.params).id);
  const body = doseActionSchema.safeParse(await request.json().catch(() => null));
  if (!id.success || !body.success) return NextResponse.json({ error: "Choose a valid dose action." }, { status: 400 });

  const db = getFirestore();
  const circle = db.collection("circles").doc(session.circleCode);
  const doseRef = circle.collection("doses").doc(id.data);
  try {
    const result = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(doseRef);
      if (!snapshot.exists) return null;
      const parsed = doseSchema.safeParse(snapshot.data());
      if (!parsed.success) throw new Error("Stored dose data is invalid.");
      const action = body.data.action === "taken" ? "taken" : body.data.action === "skipped" ? "skipped" : "snooze";
      const transition = transitionDose(parsed.data.state, action, new Date(), parsed.data.snoozeUsed);
      transaction.update(doseRef, { ...transition, updatedAt: new Date().toISOString() });
      const auditRef = circle.collection("audit").doc();
      transaction.set(auditRef, {
        actorRole: session.role,
        action: `dose.${body.data.action}`,
        source: "app",
        targetId: id.data,
        details: {},
        createdAt: new Date().toISOString(),
      });
      return transition;
    });
    if (!result) return NextResponse.json({ error: "Dose not found." }, { status: 404 });
    return NextResponse.json({ status: result.state, snoozeUntil: result.snoozeUntil });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Cannot ")) {
      return NextResponse.json({ error: "That action is not available for this dose." }, { status: 409 });
    }
    throw error;
  }
}
