import { NextResponse } from "next/server";
import { z } from "zod";
import { getFirestore } from "@/lib/db";
import { hasValidOrigin } from "@/lib/csrf";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth";
import { circleSchema } from "@/lib/schemas";

const emptyRequestSchema = z.object({});

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) {
    return NextResponse.json({ error: "This request could not be verified." }, { status: 403 });
  }
  const parsed = emptyRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const demo = await getFirestore().collection("circles").doc("DEMO0000").get();
  const circle = demo.exists ? circleSchema.safeParse(demo.data()) : undefined;
  if (!circle?.success) {
    return NextResponse.json({ error: "The demo circle is not ready yet. Please try again later." }, { status: 503 });
  }
  const token = await signSession({
    circleCode: "DEMO0000",
    role: "caretaker",
    passcodeVersion: circle.data.passcodeVersion,
  });
  const response = NextResponse.json({ status: "signed-in" });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
