import { NextResponse } from "next/server";
import { z } from "zod";
import { hasValidOrigin } from "@/lib/csrf";
import { getFirestore } from "@/lib/db";
import { getApiSession } from "@/lib/require-session";
import { medicationSchema } from "@/lib/schemas";

const requestSchema = z.object({
  source: z.literal("photo"),
  medications: z.array(medicationSchema).min(1).max(10),
});

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) {
    return NextResponse.json({ error: "This request could not be verified." }, { status: 403 });
  }
  const { session, status } = await getApiSession("editMedications");
  if (!session) return NextResponse.json({ error: "You cannot manage medicines in this circle." }, { status });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Review the medicine details and try again." }, { status: 400 });

  const db = getFirestore();
  const circle = db.collection("circles").doc(session.circleCode);
  const batch = db.batch();
  const now = new Date().toISOString();
  const pending = session.role === "caretaker" && session.circle.autonomy === "approval";
  for (const medication of parsed.data.medications) {
    if (pending) {
      const changeRef = circle.collection("pendingChanges").doc();
      batch.create(changeRef, {
        type: "create",
        payload: medication,
        requestedBy: session.role,
        requestedAt: now,
        status: "pending",
      });
      batch.set(circle.collection("audit").doc(), {
        actorRole: session.role,
        action: "medication.create_requested",
        source: "photo",
        targetId: changeRef.id,
        details: {},
        createdAt: now,
      });
    } else {
      batch.create(circle.collection("medications").doc(), { ...medication, createdAt: now });
      batch.set(circle.collection("audit").doc(), {
        actorRole: session.role,
        action: "medication.created",
        source: "photo",
        details: {},
        createdAt: now,
      });
    }
  }
  await batch.commit();
  return NextResponse.json({ status: pending ? "pending" : "saved", count: parsed.data.medications.length }, {
    status: pending ? 202 : 201,
  });
}
