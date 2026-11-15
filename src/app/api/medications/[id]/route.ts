import { NextResponse } from "next/server";
import { z } from "zod";
import { hasValidOrigin } from "@/lib/csrf";
import { getApiSession } from "@/lib/require-session";
import { getFirestore } from "@/lib/db";
import { medicationUpdateSchema } from "@/lib/schemas";

const idSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!hasValidOrigin(request)) {
    return NextResponse.json({ error: "This request could not be verified." }, { status: 403 });
  }
  const { session, status } = await getApiSession("editMedications");
  if (!session) return NextResponse.json({ error: "You cannot manage medicines in this circle." }, { status });
  const id = idSchema.safeParse((await context.params).id);
  const patch = medicationUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!id.success || !patch.success) return NextResponse.json({ error: "Check the medicine changes and try again." }, { status: 400 });

  const db = getFirestore();
  const circle = db.collection("circles").doc(session.circleCode);
  const medications = circle.collection("medications");
  if (session.role === "caretaker" && session.circle.autonomy === "approval") {
    const pending = circle.collection("pendingChanges").doc();
    const batch = db.batch();
    batch.create(pending, {
      type: "update",
      medicationId: id.data,
      patch: patch.data,
      requestedBy: session.role,
      requestedAt: new Date().toISOString(),
      status: "pending",
    });
    batch.set(circle.collection("audit").doc(), {
      actorRole: session.role,
      action: "medication.update_requested",
      source: "app",
      targetId: pending.id,
      details: {},
      createdAt: new Date().toISOString(),
    });
    await batch.commit();
    return NextResponse.json({ pendingChangeId: pending.id, status: "pending" }, { status: 202 });
  }
  const batch = db.batch();
  batch.update(medications.doc(id.data), { ...patch.data, updatedAt: new Date().toISOString() });
  batch.set(circle.collection("audit").doc(), {
    actorRole: session.role,
    action: "medication.updated",
    source: "app",
    targetId: id.data,
    details: {},
    createdAt: new Date().toISOString(),
  });
  await batch.commit();
  return NextResponse.json({ status: "updated" });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!hasValidOrigin(request)) {
    return NextResponse.json({ error: "This request could not be verified." }, { status: 403 });
  }
  const { session, status } = await getApiSession("editMedications");
  if (!session) return NextResponse.json({ error: "You cannot manage medicines in this circle." }, { status });
  const id = idSchema.safeParse((await context.params).id);
  if (!id.success) return NextResponse.json({ error: "Invalid medicine id." }, { status: 400 });

  const db = getFirestore();
  const circle = db.collection("circles").doc(session.circleCode);
  const medications = circle.collection("medications");
  if (session.role === "caretaker" && session.circle.autonomy === "approval") {
    const pending = circle.collection("pendingChanges").doc();
    const batch = db.batch();
    batch.create(pending, {
      type: "delete",
      medicationId: id.data,
      requestedBy: session.role,
      requestedAt: new Date().toISOString(),
      status: "pending",
    });
    batch.set(circle.collection("audit").doc(), {
      actorRole: session.role,
      action: "medication.delete_requested",
      source: "app",
      targetId: pending.id,
      details: {},
      createdAt: new Date().toISOString(),
    });
    await batch.commit();
    return NextResponse.json({ pendingChangeId: pending.id, status: "pending" }, { status: 202 });
  }
  const batch = db.batch();
  batch.delete(medications.doc(id.data));
  batch.set(circle.collection("audit").doc(), {
    actorRole: session.role,
    action: "medication.deleted",
    source: "app",
    targetId: id.data,
    details: {},
    createdAt: new Date().toISOString(),
  });
  await batch.commit();
  return NextResponse.json({ status: "deleted" });
}
