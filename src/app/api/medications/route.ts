import { NextResponse } from "next/server";
import { z } from "zod";
import { hasValidOrigin } from "@/lib/csrf";
import { getApiSession } from "@/lib/require-session";
import { getFirestore } from "@/lib/db";
import { medicationSchema } from "@/lib/schemas";

const MAX_MEDICATIONS = 100;
const createMedicationRequestSchema = z.union([
  medicationSchema,
  z.object({ medication: medicationSchema, source: z.enum(["app", "photo"]).default("app") }),
]);

export async function GET() {
  const { session, status } = await getApiSession("view");
  if (!session) return NextResponse.json({ error: "Sign in to view medicines." }, { status });
  const snapshot = await getFirestore()
    .collection("circles").doc(session.circleCode)
    .collection("medications")
    .limit(MAX_MEDICATIONS)
    .get();
  return NextResponse.json({ medications: snapshot.docs.map((document) => ({ id: document.id, ...document.data() })) });
}

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) {
    return NextResponse.json({ error: "This request could not be verified." }, { status: 403 });
  }
  const { session, status } = await getApiSession("editMedications");
  if (!session) return NextResponse.json({ error: "You cannot manage medicines in this circle." }, { status });
  const parsed = createMedicationRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the medicine details and try again." }, { status: 400 });
  const medication = "medication" in parsed.data ? parsed.data.medication : parsed.data;
  const source = "medication" in parsed.data ? parsed.data.source : "app";

  const db = getFirestore();
  const circle = db.collection("circles").doc(session.circleCode);
  const medications = circle.collection("medications");
  if (session.role === "caretaker" && session.circle.autonomy === "approval") {
    const pending = circle.collection("pendingChanges").doc();
    const batch = db.batch();
    batch.create(pending, {
      type: "create",
      payload: medication,
      requestedBy: session.role,
      requestedAt: new Date().toISOString(),
      status: "pending",
    });
    batch.set(circle.collection("audit").doc(), {
      actorRole: session.role,
      action: "medication.create_requested",
      source,
      targetId: pending.id,
      details: {},
      createdAt: new Date().toISOString(),
    });
    await batch.commit();
    return NextResponse.json({ pendingChangeId: pending.id, status: "pending" }, { status: 202 });
  }
  const medicationRef = medications.doc();
  const batch = db.batch();
  batch.create(medicationRef, { ...medication, createdAt: new Date().toISOString() });
  batch.set(circle.collection("audit").doc(), {
    actorRole: session.role,
    action: "medication.created",
    source,
    targetId: medicationRef.id,
    details: {},
    createdAt: new Date().toISOString(),
  });
  await batch.commit();
  return NextResponse.json({ id: medicationRef.id }, { status: 201 });
}
