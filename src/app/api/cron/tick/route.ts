import { createHash } from "node:crypto";
import { FieldPath, type DocumentData, type Query } from "@google-cloud/firestore";
import { NextResponse } from "next/server";
import { z } from "zod";
import { claimNotification, finishNotification } from "@/lib/notification-claims";
import { transitionDose } from "@/lib/dose";
import { getFirestore } from "@/lib/db";
import { renderAppointmentEmail, renderDoseEmail, sendMail } from "@/lib/mail";
import {
  isWithinNotificationWindow,
  missedDoseGraceMilliseconds,
  missedDoseRecipients,
} from "@/lib/notification-policy";
import { secretsMatch } from "@/lib/secret-compare";
import {
  appointmentSchema,
  circleSchema,
  doseSchema,
  medicationSchema,
  type Contact,
} from "@/lib/schemas";
import { generateDoseOccurrences } from "@/lib/schedule";
import { localDateAt } from "@/lib/time";

const cronHeaderSchema = z.string().min(1).max(256);
const MAX_CIRCLES_PER_TICK = 20;
const MAX_MEDICATIONS = 100;
const MAX_DOSES_PER_CIRCLE = 300;
const MAX_APPOINTMENTS_PER_CIRCLE = 100;
const MAX_GENERATED_PER_CIRCLE = 300;
const MINUTE = 60_000;

type TickStats = { circles: number; doses: number; notifications: number; dryRun: number; failed: number };

function followingDate(date: string): string {
  return new Date(Date.parse(`${date}T00:00:00.000Z`) + 86_400_000).toISOString().slice(0, 10);
}

function notificationId(type: string, eventId: string, email: string): string {
  return createHash("sha256").update(`${type}:${eventId}:${email.toLowerCase()}`).digest("hex");
}

async function createUpcomingDoses(circleCode: string, timeZone: string, now: number): Promise<number> {
  const db = getFirestore();
  const circle = db.collection("circles").doc(circleCode);
  const medications = await circle.collection("medications").limit(MAX_MEDICATIONS).get();
  const today = localDateAt(new Date(now), timeZone);
  const throughDate = followingDate(today);
  const occurrences = medications.docs.flatMap((document) => {
    const medication = medicationSchema.safeParse(document.data());
    if (!medication.success) return [];
    return generateDoseOccurrences(document.id, medication.data, today, throughDate, timeZone)
      .map((occurrence) => ({ occurrence, medication: medication.data }));
  }).slice(0, MAX_GENERATED_PER_CIRCLE);

  if (occurrences.length === 0) return 0;
  const refs = occurrences.map(({ occurrence }) => circle.collection("doses").doc(occurrence.id));
  const existing = await db.getAll(...refs);
  const batch = db.batch();
  let created = 0;
  occurrences.forEach(({ occurrence, medication }, index) => {
    if (existing[index]?.exists) return;
    const nowIso = new Date(now).toISOString();
    batch.create(refs[index], {
      medicationId: occurrence.medicationId,
      medicationName: medication.name,
      strength: medication.strength,
      instructions: medication.instructions,
      scheduledAt: occurrence.scheduledAt,
      localDate: occurrence.localDate,
      localTime: occurrence.localTime,
      state: "scheduled",
      critical: medication.critical,
      snoozeUsed: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    created += 1;
  });
  if (created > 0) await batch.commit();
  return created;
}

async function updateDueStates(circleCode: string, graceMinutes: number, now: number): Promise<void> {
  const db = getFirestore();
  const circle = db.collection("circles").doc(circleCode);
  const snapshot = await circle.collection("doses")
    .where("scheduledAt", "<=", new Date(now).toISOString())
    .orderBy("scheduledAt", "desc")
    .limit(MAX_DOSES_PER_CIRCLE)
    .get();
  for (const document of snapshot.docs) {
    await db.runTransaction(async (transaction) => {
      const currentSnapshot = await transaction.get(document.ref);
      if (!currentSnapshot.exists) return;
      const parsed = doseSchema.safeParse(currentSnapshot.data());
      if (!parsed.success) return;
      let state = parsed.data.state;
      if (state === "scheduled") state = transitionDose(state, "markDue", new Date(now)).state;
      const grace = missedDoseGraceMilliseconds(graceMinutes, parsed.data.critical);
      if (state === "due" && now >= Date.parse(parsed.data.scheduledAt) + grace) {
        state = transitionDose(state, "missed", new Date(now)).state;
      }
      if (state !== parsed.data.state) {
        transaction.update(document.ref, { state, updatedAt: new Date(now).toISOString() });
        transaction.set(circle.collection("audit").doc(), {
          actorRole: "system",
          action: `dose.${state}`,
          source: "app",
          targetId: document.id,
          details: { from: parsed.data.state, to: state },
          createdAt: new Date(now).toISOString(),
        });
      }
    });
  }
}

async function sendClaimedEmail(
  circleCode: string,
  id: string,
  recipient: Contact,
  content: { subject: string; html: string; text: string },
  stats: TickStats,
): Promise<void> {
  const db = getFirestore();
  const now = Date.now();
  if (!await claimNotification(db, circleCode, id, now)) return;
  stats.notifications += 1;
  try {
    const result = await sendMail(recipient.email, content);
    await finishNotification(db, circleCode, id, "sent", Date.now());
    if (result.dryRun) stats.dryRun += 1;
  } catch {
    await finishNotification(db, circleCode, id, "failed", Date.now());
    stats.failed += 1;
  }
}

async function failedClaimIds(circleCode: string): Promise<Set<string>> {
  const snapshot = await getFirestore().collection("circles").doc(circleCode)
    .collection("notifications").where("status", "==", "failed").limit(100).get();
  return new Set(snapshot.docs.map((document) => document.id));
}

async function processDoseNotifications(
  circleCode: string,
  timeZone: string,
  graceMinutes: number,
  contacts: Contact[],
  now: number,
  failed: ReadonlySet<string>,
  stats: TickStats,
): Promise<void> {
  const db = getFirestore();
  const doses = db.collection("circles").doc(circleCode).collection("doses");
  const from = new Date(now - 16 * MINUTE).toISOString();
  const through = new Date(now + 16 * MINUTE).toISOString();
  const upcoming = await doses.where("scheduledAt", ">=", from).where("scheduledAt", "<=", through)
    .orderBy("scheduledAt").limit(MAX_DOSES_PER_CIRCLE).get();

  for (const document of upcoming.docs) {
    const parsed = doseSchema.safeParse(document.data());
    if (!parsed.success || !["scheduled", "due"].includes(parsed.data.state)) continue;
    const scheduleInstant = Date.parse(parsed.data.scheduledAt);
    const withinWindow = isWithinNotificationWindow(scheduleInstant, 15 * MINUTE, now);
    const content = renderDoseEmail({
      circleCode,
      doseId: document.id,
      medicine: { name: parsed.data.medicationName, strength: parsed.data.strength, instructions: parsed.data.instructions },
      scheduledAt: parsed.data.scheduledAt,
      localDate: parsed.data.localDate,
      localTime: parsed.data.localTime,
      timeZone,
      kind: "upcoming",
      snoozeUsed: parsed.data.snoozeUsed,
    });
    for (const recipient of contacts) {
      const id = notificationId("dose_upcoming", document.id, recipient.email);
      if (!withinWindow && !failed.has(id)) continue;
      await sendClaimedEmail(circleCode, id, recipient, content, stats);
    }
  }

  const missedSnapshot = await doses.where("state", "==", "missed")
    .orderBy("scheduledAt", "desc").limit(MAX_DOSES_PER_CIRCLE).get();
  for (const document of missedSnapshot.docs) {
    const parsed = doseSchema.safeParse(document.data());
    if (!parsed.success) continue;
    const grace = missedDoseGraceMilliseconds(graceMinutes, parsed.data.critical);
    const recipients = missedDoseRecipients(contacts, parsed.data.critical, Date.parse(parsed.data.scheduledAt), grace, now);
    const content = renderDoseEmail({
      circleCode,
      doseId: document.id,
      medicine: { name: parsed.data.medicationName, strength: parsed.data.strength, instructions: parsed.data.instructions },
      scheduledAt: parsed.data.scheduledAt,
      localDate: parsed.data.localDate,
      localTime: parsed.data.localTime,
      timeZone,
      kind: "missed",
      snoozeUsed: parsed.data.snoozeUsed,
    });
    for (const recipient of recipients) {
      const type = recipient.role === "family" ? "dose_family_escalation" : "dose_missed";
      const id = notificationId(type, document.id, recipient.email);
      await sendClaimedEmail(circleCode, id, recipient, content, stats);
    }
  }

  const dueSnapshot = await doses.where("state", "==", "due").limit(MAX_DOSES_PER_CIRCLE).get();
  for (const document of dueSnapshot.docs) {
    const parsed = doseSchema.safeParse(document.data());
    if (!parsed.success || !parsed.data.snoozeUntil) continue;
    const snoozeAt = Date.parse(parsed.data.snoozeUntil);
    if (!isWithinNotificationWindow(snoozeAt, 0, now)) continue;
    const content = renderDoseEmail({
      circleCode,
      doseId: document.id,
      medicine: { name: parsed.data.medicationName, strength: parsed.data.strength, instructions: parsed.data.instructions },
      scheduledAt: parsed.data.scheduledAt,
      localDate: parsed.data.localDate,
      localTime: parsed.data.localTime,
      timeZone,
      kind: "snooze",
      snoozeUsed: parsed.data.snoozeUsed,
    });
    for (const recipient of contacts) {
      const id = notificationId("dose_snooze", document.id, recipient.email);
      await sendClaimedEmail(circleCode, id, recipient, content, stats);
    }
  }
}

async function processAppointmentNotifications(
  circleCode: string,
  contacts: Contact[],
  now: number,
  failed: ReadonlySet<string>,
  stats: TickStats,
): Promise<void> {
  const snapshot = await getFirestore().collection("circles").doc(circleCode)
    .collection("appointments")
    .where("scheduledAt", ">=", new Date(now - 24 * 60 * MINUTE).toISOString())
    .where("scheduledAt", "<=", new Date(now + 24 * 60 * MINUTE).toISOString())
    .orderBy("scheduledAt").limit(MAX_APPOINTMENTS_PER_CIRCLE).get();
  for (const document of snapshot.docs) {
    const parsed = appointmentSchema.safeParse(document.data());
    if (!parsed.success) continue;
    const scheduledAt = Date.parse(parsed.data.scheduledAt);
    for (const reminder of [
      { type: "appointment_24h", lead: 24 * 60 * MINUTE, label: "24-hour" as const },
      { type: "appointment_2h", lead: 2 * 60 * MINUTE, label: "2-hour" as const },
    ]) {
      const withinWindow = isWithinNotificationWindow(scheduledAt, reminder.lead, now);
      for (const recipient of contacts) {
        const id = notificationId(reminder.type, document.id, recipient.email);
        if (!withinWindow && !failed.has(id)) continue;
        const content = renderAppointmentEmail({ ...parsed.data, reminder: reminder.label });
        await sendClaimedEmail(circleCode, id, recipient, content, stats);
      }
    }
  }
}

async function processCircle(code: string, data: DocumentData, now: number, stats: TickStats): Promise<void> {
  const parsedCircle = circleSchema.safeParse(data);
  if (!parsedCircle.success || code === "DEMO0000") return;
  const circle = parsedCircle.data;
  stats.doses += await createUpcomingDoses(code, circle.timezone, now);
  await updateDueStates(code, circle.graceMinutes, now);
  const failed = await failedClaimIds(code);
  await processDoseNotifications(code, circle.timezone, circle.graceMinutes, circle.contacts, now, failed, stats);
  await processAppointmentNotifications(code, circle.contacts, now, failed, stats);
}

async function getCircleBatch(): Promise<Array<{ id: string; data: DocumentData }>> {
  const db = getFirestore();
  const stateRef = db.collection("system").doc("cronCircleCursor");
  const state = await stateRef.get();
  const cursor = typeof state.get("lastCircleCode") === "string" ? state.get("lastCircleCode") as string : undefined;
  const baseQuery = db.collection("circles").orderBy(FieldPath.documentId());
  let query: Query<DocumentData> = baseQuery.limit(MAX_CIRCLES_PER_TICK);
  if (cursor) query = baseQuery.startAfter(cursor).limit(MAX_CIRCLES_PER_TICK);
  let snapshot = await query.get();
  if (snapshot.empty && cursor) snapshot = await baseQuery.limit(MAX_CIRCLES_PER_TICK).get();
  if (snapshot.empty) return [];
  await stateRef.set({ lastCircleCode: snapshot.docs.at(-1)?.id ?? "" });
  return snapshot.docs.map((document) => ({ id: document.id, data: document.data() }));
}

async function runTick() {
  const now = Date.now();
  const circles = await getCircleBatch();
  const stats: TickStats = { circles: circles.length, doses: 0, notifications: 0, dryRun: 0, failed: 0 };
  for (const circle of circles) await processCircle(circle.id, circle.data, now, stats);
  return NextResponse.json({ status: "ok", ...stats });
}

export async function POST(request: Request) {
  const header = cronHeaderSchema.safeParse(request.headers.get("x-cron-secret"));
  if (!header.success || !secretsMatch(header.data, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return runTick();
}

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  const bearer = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;
  const header = cronHeaderSchema.safeParse(bearer);
  if (!header.success || !secretsMatch(header.data, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return runTick();
}
