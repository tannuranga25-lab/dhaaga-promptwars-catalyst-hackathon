import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthorizedSession } from "@/lib/require-session";
import { hashPasscode, generatePasscode } from "@/lib/crypto";
import { getFirestore } from "@/lib/db";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth";

const emptyRequestSchema = z.object({});

export async function POST(request: Request) {
  const parsed = emptyRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const session = await getAuthorizedSession("manageCircle");
  if (!session || session.role !== "elder") {
    return NextResponse.json({ error: "Only the elder can regenerate passcodes." }, { status: 403 });
  }

  const caretaker = generatePasscode();
  const family = generatePasscode();
  const hashes = {
    caretaker: await hashPasscode(caretaker),
    family: await hashPasscode(family),
  };
  const circleRef = getFirestore().collection("circles").doc(session.circleCode);
  const version = await getFirestore().runTransaction(async (transaction) => {
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
