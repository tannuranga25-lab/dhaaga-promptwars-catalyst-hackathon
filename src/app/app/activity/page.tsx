import Link from "next/link";
import { requirePageSession } from "@/lib/require-session";
import { getFirestore } from "@/lib/db";
import { auditSchema } from "@/lib/schemas";
import { z } from "zod";

const querySchema = z.object({ cursor: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/).optional() });

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const session = await requirePageSession("viewAudit");
  const parsedQuery = querySchema.safeParse(await searchParams);
  const cursorId = parsedQuery.success ? parsedQuery.data.cursor : undefined;
  const activity = getFirestore().collection("circles").doc(session.circleCode).collection("audit");
  let auditQuery = activity.orderBy("createdAt", "desc").limit(31);
  if (cursorId) {
    const cursor = await activity.doc(cursorId).get();
    if (cursor.exists) auditQuery = activity.orderBy("createdAt", "desc").startAfter(cursor).limit(31);
  }
  const snapshot = await auditQuery.get();
  const hasMore = snapshot.docs.length > 30;
  const entries = snapshot.docs.flatMap((document) => {
    const parsed = auditSchema.safeParse(document.data());
    return parsed.success ? [{ id: document.id, ...parsed.data }] : [];
  }).slice(0, 30);
  return (
    <main id="main-content" className="page-shell">
      <section className="card">
        <p><Link href="/app">Back to circle</Link></p>
        <h1>Circle activity</h1>
        <p className="muted">Recent updates, newest first.</p>
        {entries.length === 0 ? <p>No activity recorded yet.</p> : (
          <ol className="activity-list">
            {entries.map((entry) => (
              <li key={entry.id}>
                <strong>{entry.action.replaceAll(".", " ")}</strong>
                <span> by {entry.actorRole} · {new Date(entry.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ol>
        )}
        {cursorId && <p><Link href="/app/activity">First page</Link></p>}
        {!parsedQuery.success && <p className="status" role="status">That activity page could not be opened.</p>}
        {hasMore && <p><Link href={`/app/activity?cursor=${encodeURIComponent(snapshot.docs[29]?.id ?? "")}`}>Next page</Link></p>}
      </section>
    </main>
  );
}
