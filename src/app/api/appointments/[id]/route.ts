import { NextResponse } from "next/server";
import { z } from "zod";
import { hasValidOrigin } from "@/lib/csrf";
import { getFirestore } from "@/lib/db";
import { appointmentUpdateSchema } from "@/lib/schemas";
import { getApiSession } from "@/lib/require-session";

const idSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!hasValidOrigin(request)) {
    return NextResponse.json({ error: "This request could not be verified." }, { status: 403 });
  }
  const { session, status } = await getApiSession("editAppointments");
  if (!session) return NextResponse.json({ error: "You cannot manage appointments in this circle." }, { status });
  const id = idSchema.safeParse((await context.params).id);
  const patch = appointmentUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!id.success || !patch.success) return NextResponse.json({ error: "Check the appointment changes and try again." }, { status: 400 });
  const db = getFirestore();
  const circle = db.collection("circles").doc(session.circleCode);
  const batch = db.batch();
  const now = new Date().toISOString();
  batch.update(circle.collection("appointments").doc(id.data), { ...patch.data, updatedAt: now });
  batch.set(circle.collection("audit").doc(), {
    actorRole: session.role,
    action: "appointment.updated",
    source: "app",
    targetId: id.data,
    details: {},
    createdAt: now,
  });
  await batch.commit();
  return NextResponse.json({ status: "updated" });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!hasValidOrigin(request)) {
    return NextResponse.json({ error: "This request could not be verified." }, { status: 403 });
  }
  const { session, status } = await getApiSession("editAppointments");
  if (!session) return NextResponse.json({ error: "You cannot manage appointments in this circle." }, { status });
  const id = idSchema.safeParse((await context.params).id);
  if (!id.success) return NextResponse.json({ error: "Invalid appointment id." }, { status: 400 });
  const db = getFirestore();
  const circle = db.collection("circles").doc(session.circleCode);
  const batch = db.batch();
  const now = new Date().toISOString();
  batch.delete(circle.collection("appointments").doc(id.data));
  batch.set(circle.collection("audit").doc(), {
    actorRole: session.role,
    action: "appointment.deleted",
    source: "app",
    targetId: id.data,
    details: {},
    createdAt: now,
  });
  await batch.commit();
  return NextResponse.json({ status: "deleted" });
}
