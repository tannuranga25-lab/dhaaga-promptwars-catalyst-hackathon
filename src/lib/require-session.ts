import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { can, type Action } from "@/lib/permissions";
import { isCurrentPasscodeVersion, SESSION_COOKIE, verifySession } from "@/lib/auth";
import { getFirestore } from "@/lib/db";
import { circleSchema } from "@/lib/schemas";

export async function getApiSession(action: Action) {
  const identity = await getSessionIdentity();
  if (!identity) return { session: null, status: 401 as const };
  if (!can(identity.role, action)) return { session: null, status: 403 as const };
  const snapshot = await getFirestore().collection("circles").doc(identity.circleCode).get();
  if (!snapshot.exists) return { session: null, status: 401 as const };
  const circle = circleSchema.parse(snapshot.data());
  if (!isCurrentPasscodeVersion(identity.passcodeVersion, circle.passcodeVersion)) {
    return { session: null, status: 401 as const };
  }
  return { session: { ...identity, circle }, status: 200 as const };
}

export async function getSessionIdentity() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    return await verifySession(token);
  } catch {
    return null;
  }
}

export async function getAuthorizedSession(action: Action) {
  const result = await getApiSession(action);
  return result.session;
}

export async function requirePageSession(action: Action) {
  const session = await getAuthorizedSession(action);
  if (!session) redirect("/login");
  return session;
}
