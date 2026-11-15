import { NextResponse } from "next/server";
import { hasValidOrigin } from "@/lib/csrf";
import { getFirestore } from "@/lib/db";
import { appointmentSchema } from "@/lib/schemas";
import { getApiSession } from "@/lib/require-session";

const MAX_APPOINTMENTS = 100;

export async function GET() {
  const { session, status } = await getApiSession("view");
  if (!session) return NextResponse.json({ error: "Sign in to view appointments." }, { status });
  const snapshot = await getFirestore()
    .collection("circles").doc(session.circleCode)
    .collection("appointments")
    .where("scheduledAt", ">=", new Date().toISOString())
    .orderBy("scheduledAt")
    .limit(MAX_APPOINTMENTS)
    .get();
  return NextResponse.json({ appointments: snapshot.docs.map((document) => ({ id: document.id, ...document.data() })) });
}

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) {
    return NextResponse.json({ error: "This request could not be verified." }, { status: 403 });
  }
  const { session, status } = await getApiSession("editAppointments");
  if (!session) return NextResponse.json({ error: "You cannot manage appointments in this circle." }, { status });
  const parsed = appointmentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the appointment details and try again." }, { status: 400 });
  const db = getFirestore();
  const circle = db.collection("circles").doc(session.circleCode);
  const appointment = circle.collection("appointments").doc();
  const batch = db.batch();
  const now = new Date().toISOString();
  batch.create(appointment, { ...parsed.data, createdAt: now });
  batch.set(circle.collection("audit").doc(), {
    actorRole: session.role,
    action: "appointment.created",
    source: "app",
    targetId: appointment.id,
    details: {},
    createdAt: now,
  });
  await batch.commit();
  return NextResponse.json({ id: appointment.id }, { status: 201 });
}
