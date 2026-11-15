import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthorizedSession } from "@/lib/require-session";
import { hashPasscode, generatePasscode } from "@/lib/crypto";
import { getFirestore } from "@/lib/db";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth";
import { hasValidOrigin } from "@/lib/csrf";

const emptyRequestSchema = z.object({});

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) {
    return NextResponse.json({ error: "This request could not be verified." }, { status: 403 });
  }
  const parsed = emptyRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const session = await getAuthorizedSession("manageCircle");
  if (!session || session.role !== "elder") {
    return NextResponse.json({ error: "Only the elder can regenerate passcodes." }, { status: 403 });
  }
  if (session.circleCode === "DEMO0000") {
    return NextResponse.json({ error: "Passcodes cannot be changed in the demo circle." }, { status: 403 });
  }

  const caretaker = generatePasscode();
  const family = generatePasscode();
  const hashes = {
    caretaker: await hashPasscode(caretaker),
    family: await hashPasscode(family),
  };
  const circleRef = getFirestore().collection("circles").doc(session.circleCode);
  const db = getFirestore();
  const version = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(circleRef);
    if (!snapshot.exists) throw new Error("Circle no longer exists.");
    const currentVersion = snapshot.get("passcodeVersion");
    if (currentVersion !== session.passcodeVersion) throw new Error("Passcodes changed in another session.");
    const nextVersion = currentVersion + 1;
    transaction.update(circleRef, {
      "passcodeHashes.caretaker": hashes.caretaker,
      "passcodeHashes.family": hashes.family,
      passcodeVersion: nextVersion,
    });
    transaction.set(circleRef.collection("audit").doc(), {
      actorRole: "elder",
      action: "circle.passcodes_regenerated",
      source: "app",
      details: {},
      createdAt: new Date().toISOString(),
    });
    return nextVersion;
  });
  const token = await signSession({
    circleCode: session.circleCode,
    role: "elder",
    passcodeVersion: version,
  });
  const response = NextResponse.json({ passcodes: { caretaker, family } });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
