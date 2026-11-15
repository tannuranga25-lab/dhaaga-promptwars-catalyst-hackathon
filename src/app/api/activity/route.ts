import { NextResponse } from "next/server";
import { z } from "zod";
import { getFirestore } from "@/lib/db";
import { getApiSession } from "@/lib/require-session";
import { auditSchema } from "@/lib/schemas";

const pageSchema = z.object({ cursor: z.string().max(128).optional() });
const PAGE_SIZE = 30;

export async function GET(request: Request) {
  const { session, status } = await getApiSession("viewAudit");
  if (!session) return NextResponse.json({ error: "You cannot view this activity." }, { status });
  const query = pageSchema.safeParse({
    cursor: new URL(request.url).searchParams.get("cursor") ?? undefined,
  });
  if (!query.success) return NextResponse.json({ error: "Invalid activity page." }, { status: 400 });
  let auditQuery = getFirestore().collection("circles").doc(session.circleCode)
    .collection("audit").orderBy("createdAt", "desc").limit(PAGE_SIZE + 1);
  if (query.data.cursor) {
    const cursor = await getFirestore().collection("circles").doc(session.circleCode)
      .collection("audit").doc(query.data.cursor).get();
    if (!cursor.exists) return NextResponse.json({ error: "Activity page not found." }, { status: 400 });
    auditQuery = auditQuery.startAfter(cursor);
  }
  const snapshot = await auditQuery.get();
  const hasMore = snapshot.docs.length > PAGE_SIZE;
  const rows = snapshot.docs.slice(0, PAGE_SIZE).flatMap((document) => {
    const parsed = auditSchema.safeParse(document.data());
    return parsed.success ? [{ id: document.id, ...parsed.data }] : [];
  });
  return NextResponse.json({ entries: rows, nextCursor: hasMore ? snapshot.docs[PAGE_SIZE - 1]?.id : null });
}
