import { NextResponse } from "next/server";
import { z } from "zod";
import { hasValidOrigin } from "@/lib/csrf";
import { getFirestore } from "@/lib/db";
import { getApiSession } from "@/lib/require-session";
import { contactSchema } from "@/lib/schemas";

const settingsSchema = z.object({
  autonomy: z.enum(["direct", "approval"]).optional(),
  contacts: z.array(contactSchema).max(20).optional(),
}).refine((value) => Object.keys(value).length > 0, "Provide at least one circle setting.");

export async function PATCH(request: Request) {
  if (!hasValidOrigin(request)) {
    return NextResponse.json({ error: "This request could not be verified." }, { status: 403 });
  }
  const { session, status } = await getApiSession("manageCircle");
  if (!session || session.role !== "elder") {
    return NextResponse.json({ error: "Only the elder can manage circle settings." }, { status });
  }
  if (session.circleCode === "DEMO0000") {
    return NextResponse.json({ error: "Circle settings cannot be changed in the demo." }, { status: 403 });
  }
  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the circle settings and try again." }, { status: 400 });
  const db = getFirestore();
  const circle = db.collection("circles").doc(session.circleCode);
  const batch = db.batch();
  batch.update(circle, parsed.data);
  batch.set(circle.collection("audit").doc(), {
    actorRole: session.role,
    action: "circle.settings_updated",
    source: "app",
    details: {},
    createdAt: new Date().toISOString(),
  });
  await batch.commit();
  return NextResponse.json({ status: "updated" });
}
