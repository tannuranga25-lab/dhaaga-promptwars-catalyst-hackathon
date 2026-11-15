import { NextResponse } from "next/server";
import { z } from "zod";
import { hasValidOrigin } from "@/lib/csrf";
import { transitionDose } from "@/lib/dose";
import { verifyEmailActionToken } from "@/lib/email-action-token";
import { getFirestore } from "@/lib/db";
import { doseSchema } from "@/lib/schemas";

const requestSchema = z.object({ token: z.string().min(1).max(2048) });

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) {
    return NextResponse.json({ error: "This request could not be verified." }, { status: 403 });
  }
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "This email action link is invalid." }, { status: 400 });
  let action;
  try {
    action = verifyEmailActionToken(parsed.data.token);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("EMAIL_ACTION_SECRET")) throw error;
    return NextResponse.json({ error: "This email action link is invalid or expired." }, { status: 400 });
  }

  const db = getFirestore();
  const circle = db.collection("circles").doc(action.circleCode);
  const doseRef = circle.collection("doses").doc(action.doseId);
  try {
    const outcome = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(doseRef);
      if (!snapshot.exists) return "not-found";
      const dose = doseSchema.parse(snapshot.data());
      const transition = transitionDose(dose.state, action.action, new Date(), dose.snoozeUsed);
      transaction.update(doseRef, { ...transition, updatedAt: new Date().toISOString() });
      transaction.set(circle.collection("audit").doc(), {
        actorRole: "email-link",
        action: `dose.${action.action}`,
        source: "email-link",
        targetId: action.doseId,
        details: {},
        createdAt: new Date().toISOString(),
      });
      return "updated";
    });
    if (outcome === "not-found") return NextResponse.json({ error: "Dose not found." }, { status: 404 });
    return NextResponse.json({ status: "updated" });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Cannot ")) {
      return NextResponse.json({ error: "This dose can no longer be changed with this link." }, { status: 409 });
    }
    throw error;
  }
}
