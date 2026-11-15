import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/lib/schemas";

export const SESSION_COOKIE = "dhaaga_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export function isCurrentPasscodeVersion(sessionVersion: number, currentVersion: number): boolean {
  return sessionVersion === currentVersion;
}

function sessionKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || new TextEncoder().encode(secret).length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(input: {
  circleCode: string;
  role: Role;
  passcodeVersion: number;
  now?: Date;
}): Promise<string> {
  const now = input.now ?? new Date();
  return new SignJWT({
    circleCode: input.circleCode,
    role: input.role,
    passcodeVersion: input.passcodeVersion,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(Math.floor(now.getTime() / 1000))
    .setExpirationTime(Math.floor(now.getTime() / 1000) + SESSION_TTL_SECONDS)
    .setIssuer("dhaaga")
    .sign(sessionKey());
}

export async function verifySession(token: string, now?: Date): Promise<{
  circleCode: string;
  role: Role;
  passcodeVersion: number;
}> {
  const { payload } = await jwtVerify(token, sessionKey(), {
    issuer: "dhaaga",
    currentDate: now,
  });
  if (
    typeof payload.circleCode !== "string" ||
    !["elder", "caretaker", "family"].includes(String(payload.role)) ||
    typeof payload.passcodeVersion !== "number"
  ) {
    throw new Error("Invalid session claims.");
  }
  return {
    circleCode: payload.circleCode,
    role: payload.role as Role,
    passcodeVersion: payload.passcodeVersion,
  };
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}
