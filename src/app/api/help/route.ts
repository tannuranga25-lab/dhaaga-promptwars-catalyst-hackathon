import { NextResponse } from "next/server";
import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { hasValidOrigin } from "@/lib/csrf";
import { getFirestore } from "@/lib/db";
import { sendHelpRequest } from "@/lib/mail";
import { getApiSession } from "@/lib/require-session";

const emptyRequestSchema = z.object({});

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) {
    return NextResponse.json({ error: "This request could not be verified." }, { status: 403 });
  }
  const { session, status } = await getApiSession("logDose");
  if (!session) return NextResponse.json({ error: "Sign in to contact the care team." }, { status });
  const parsed = emptyRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const caretakers = session.circle.contacts.filter((contact) => contact.role === "caretaker");
  const outcomes = await Promise.allSettled(
    caretakers.map((contact) => sendHelpRequest(contact.email, session.circle.elderName)),
  );
  const db = getFirestore();
  await writeAudit(db, session.circleCode, session.role, "circle.help_requested", undefined);
  const sent = outcomes.filter((outcome) => outcome.status === "fulfilled" && !outcome.value.dryRun).length;
  const failed = outcomes.filter((outcome) => outcome.status === "rejected").length;
  return NextResponse.json({
    status: failed === outcomes.length && outcomes.length > 0 ? "failed" : "requested",
    sent,
    dryRun: sent === 0,
    failed,
  }, { status: failed === outcomes.length && outcomes.length > 0 ? 502 : 200 });
}
