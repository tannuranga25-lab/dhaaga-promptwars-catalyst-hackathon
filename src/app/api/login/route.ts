import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/schemas";
import { getFirestore } from "@/lib/db";
import { hashPasscode, normalizeCircleCode, verifyPasscode } from "@/lib/crypto";
import { clearAuthFailures, lockedOut, recordAuthFailure, requestIpAddress } from "@/lib/auth-attempts";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth";

const unknownCircleHash = hashPasscode("invalid-circle-passcode");

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid circle code and passcode." }, { status: 400 });
  }

  const code = normalizeCircleCode(parsed.data.circleCode);
  const ipAddress = requestIpAddress(request.headers.get("x-forwarded-for"), request.headers.get("x-real-ip"));
  if (await lockedOut(code, ipAddress)) {
    return NextResponse.json({ error: "Too many tries. Please wait 15 minutes before trying again." }, { status: 429 });
  }

  const ref = getFirestore().collection("circles").doc(code);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    await verifyPasscode(parsed.data.passcode, await unknownCircleHash);
    await recordAuthFailure(code, ipAddress);
    return NextResponse.json({ error: "That code or passcode did not match." }, { status: 401 });
  }
  const circle = snapshot.data();
  if (!circle || typeof circle.passcodeVersion !== "number" || !circle.passcodeHashes) {
    return NextResponse.json({ error: "This circle needs support before it can be accessed." }, { status: 500 });
  }

  const matches = await Promise.all(
    (["elder", "caretaker", "family"] as const).map(async (role) => ({
      role,
      matches: await verifyPasscode(parsed.data.passcode, String(circle.passcodeHashes[role])),
    })),
  );
  const matchedRole = matches.find((entry) => entry.matches)?.role;
  if (!matchedRole) {
    await recordAuthFailure(code, ipAddress);
    return NextResponse.json({ error: "That code or passcode did not match." }, { status: 401 });
  }

  await clearAuthFailures(code, ipAddress);
  const token = await signSession({
    circleCode: code,
    role: matchedRole,
    passcodeVersion: circle.passcodeVersion,
  });
  const response = NextResponse.json({ role: matchedRole });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
