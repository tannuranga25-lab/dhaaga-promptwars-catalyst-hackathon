import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { Firestore } from "@google-cloud/firestore";
import { z } from "zod";

const scrypt = promisify(scryptCallback);
const serviceAccountSchema = z.object({
  project_id: z.string().min(1),
  client_email: z.email(),
  private_key: z.string().min(1),
});
const projectId = process.env.FIRESTORE_PROJECT_ID;
let credentials;
if (process.env.FIRESTORE_SERVICE_ACCOUNT_JSON) {
  let input;
  try {
    input = JSON.parse(process.env.FIRESTORE_SERVICE_ACCOUNT_JSON);
  } catch {
    throw new Error("FIRESTORE_SERVICE_ACCOUNT_JSON must contain valid JSON.");
  }
  const parsed = serviceAccountSchema.safeParse(input);
  if (!parsed.success) throw new Error("FIRESTORE_SERVICE_ACCOUNT_JSON is missing required fields.");
  credentials = { client_email: parsed.data.client_email, private_key: parsed.data.private_key };
}
const db = new Firestore({
  projectId: projectId || undefined,
  ...(credentials ? { credentials } : {}),
});
const circleCode = "DEMO0000";
const now = Date.now();
const nowIso = new Date(now).toISOString();

async function hashPasscode(passcode) {
  const salt = randomBytes(16);
  const key = await scrypt(passcode, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

function localDate(instant) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(instant));
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function nextLocalDate(date, offset) {
  return new Date(Date.parse(`${date}T00:00:00.000Z`) + offset * 86_400_000).toISOString().slice(0, 10);
}

function localToUtc(date, time) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute);
  let guess = target;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(guess));
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    const represented = Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(values.hour),
      Number(values.minute),
    );
    const difference = target - represented;
    if (difference === 0) break;
    guess += difference;
  }
  return new Date(guess);
}

async function clearCollection(collection) {
  while (true) {
    const page = await collection.limit(400).get();
    if (page.empty) return;
    const batch = db.batch();
    page.docs.forEach((document) => batch.delete(document.ref));
    await batch.commit();
  }
}

async function resetDemo() {
  const circle = db.collection("circles").doc(circleCode);
  for (const name of ["medications", "doses", "appointments", "pendingChanges", "audit", "authAttempts", "notifications"]) {
    await clearCollection(circle.collection(name));
  }
}

const passcodeHashes = {
  elder: await hashPasscode("729104"),
  caretaker: await hashPasscode("DEMOCARE"),
  family: await hashPasscode("DEMOFAM1"),
};
const circleRef = db.collection("circles").doc(circleCode);

await resetDemo();
await circleRef.set({
  elderName: "Asha (Demo)",
  timezone: "Asia/Kolkata",
  graceMinutes: 30,
  autonomy: "approval",
  passcodeHashes,
  passcodeVersion: 1,
  contacts: [
    { name: "Asha (Demo)", email: "elder@example.invalid", role: "elder", notifyMissed: true },
    { name: "Demo Caretaker", email: "caretaker@example.invalid", role: "caretaker", notifyMissed: true },
    { name: "Demo Family", email: "family@example.invalid", role: "family", notifyMissed: true },
  ],
  createdAt: nowIso,
});

const medications = [
  { id: "demo-med-1", name: "Demo medicine 1", strength: "As prescribed", form: "Tablet", time: "08:00" },
  { id: "demo-med-2", name: "Demo medicine 2", strength: "As prescribed", form: "Capsule", time: "12:00" },
  { id: "demo-med-3", name: "Demo medicine 3", strength: "As prescribed", form: "Liquid", time: "16:00" },
  { id: "demo-med-4", name: "Demo medicine 4", strength: "As prescribed", form: "Tablet", time: "20:00" },
];

for (const [index, medicine] of medications.entries()) {
  await circleRef.collection("medications").doc(medicine.id).set({
    name: medicine.name,
    strength: medicine.strength,
    form: medicine.form,
    instructions: "Demo only — follow the real prescription.",
    times: [medicine.time],
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    startDate: localDate(now - 7 * 86_400_000),
    critical: index === 0,
    paused: false,
    createdAt: nowIso,
  });
}

for (let daysAgo = 6; daysAgo >= 0; daysAgo -= 1) {
  const date = nextLocalDate(localDate(now), -daysAgo);
  for (const [index, medicine] of medications.entries()) {
    const scheduledAt = localToUtc(date, medicine.time);
    const state = daysAgo === 0
      ? index === 0 ? "due" : index === 1 ? "taken" : "scheduled"
      : (daysAgo + index) % 7 === 0 ? "missed" : (daysAgo + index) % 6 === 0 ? "skipped" : "taken";
    await circleRef.collection("doses").doc(`${date}_${medicine.time.replace(":", "-")}_${medicine.id}`).set({
      medicationId: medicine.id,
      medicationName: medicine.name,
      strength: medicine.strength,
      instructions: "Demo only — follow the real prescription.",
      scheduledAt: scheduledAt.toISOString(),
      localDate: date,
      localTime: medicine.time,
      state,
      critical: index === 0,
      snoozeUsed: false,
      ...(state === "taken" || state === "skipped" ? { confirmedAt: new Date(scheduledAt.getTime() + 5 * 60_000).toISOString() } : {}),
      createdAt: scheduledAt.toISOString(),
      updatedAt: nowIso,
    });
  }
}

for (const [index, offsetDays] of [5, 10].entries()) {
  await circleRef.collection("appointments").doc(`demo-appointment-${index + 1}`).set({
    title: `Demo doctor appointment ${index + 1}`,
    clinician: "Demo clinician",
    location: "Example clinic",
    notes: "Example data only.",
    scheduledAt: new Date(now + offsetDays * 86_400_000).toISOString(),
  });
}

await circleRef.collection("pendingChanges").doc("demo-pending-change").set({
  type: "update",
  medicationId: "demo-med-1",
  patch: { instructions: "Demo request awaiting elder review." },
  requestedBy: "caretaker",
  requestedAt: nowIso,
  status: "pending",
});

console.log("Demo circle seeded and reset safely.");
await db.terminate();
