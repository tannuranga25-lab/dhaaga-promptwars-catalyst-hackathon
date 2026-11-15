import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { can, type Action } from "@/lib/permissions";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { getFirestore } from "@/lib/db";
import { circleSchema } from "@/lib/schemas";

export async function getAuthorizedSession(action: Action) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  let session;
  try {
    session = await verifySession(token);
  } catch {
    return null;
  }
  if (!can(session.role, action)) return null;
  const snapshot = await getFirestore().collection("circles").doc(session.circleCode).get();
  if (!snapshot.exists) return null;
  const circle = circleSchema.parse(snapshot.data());
  if (circle.passcodeVersion !== session.passcodeVersion) return null;
  return { ...session, circle };
}

export async function requirePageSession(action: Action) {
  const session = await getAuthorizedSession(action);
  if (!session) redirect("/login");
  return session;
}
