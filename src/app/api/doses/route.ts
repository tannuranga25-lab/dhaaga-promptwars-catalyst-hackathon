import { NextResponse } from "next/server";
import { z } from "zod";
import { doseSchema } from "@/lib/schemas";
import { getFirestore } from "@/lib/db";
import { getApiSession } from "@/lib/require-session";

const querySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export async function GET(request: Request) {
  const { session, status } = await getApiSession("view");
  if (!session) return NextResponse.json({ error: "Sign in to view dose activity." }, { status });
  const url = new URL(request.url);
  const query = querySchema.safeParse({ from: url.searchParams.get("from") ?? undefined, to: url.searchParams.get("to") ?? undefined });
  if (!query.success || (query.data.from && query.data.to && query.data.from > query.data.to)) {
    return NextResponse.json({ error: "Enter a valid dose date range." }, { status: 400 });
  }
  const end = query.data.to ?? new Date(Date.now() + 24 * 60 * 60_000).toISOString();
  const start = query.data.from ?? new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString();
  const snapshot = await getFirestore()
    .collection("circles").doc(session.circleCode)
    .collection("doses")
    .where("scheduledAt", ">=", start)
    .where("scheduledAt", "<=", end)
    .orderBy("scheduledAt")
    .limit(500)
    .get();
  const doses = snapshot.docs.flatMap((document) => {
    const parsed = doseSchema.safeParse(document.data());
    return parsed.success ? [{ id: document.id, ...parsed.data }] : [];
  });
  return NextResponse.json({ doses });
}
