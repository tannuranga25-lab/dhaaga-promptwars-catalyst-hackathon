import Link from "next/link";
import ElderActions from "@/app/app/elder/elder-actions";
import ApprovalList from "@/app/app/elder/approval-list";
import { can } from "@/lib/permissions";
import { getFirestore } from "@/lib/db";
import { appointmentSchema, doseSchema } from "@/lib/schemas";
import { localDateAt } from "@/lib/time";
import { requirePageSession } from "@/lib/require-session";

export default async function ElderModePage() {
  const session = await requirePageSession("view");
  if (session.role !== "elder") {
    return (
      <main id="main-content" className="page-shell">
        <section className="card narrow">
          <h1>Elder Mode</h1>
          <p>Only the elder can use this view.</p>
          <Link href="/app">Back to circle</Link>
        </section>
      </main>
    );
  }
  const db = getFirestore();
  const circle = db.collection("circles").doc(session.circleCode);
  const now = new Date();
  const today = localDateAt(now, session.circle.timezone);
  const [doseSnapshot, appointmentSnapshot] = await Promise.all([
    circle.collection("doses").where("scheduledAt", ">=", new Date(now.getTime() - 24 * 60 * 60_000).toISOString())
      .orderBy("scheduledAt").limit(200).get(),
    circle.collection("appointments").where("scheduledAt", ">=", now.toISOString())
      .orderBy("scheduledAt").limit(1).get(),
  ]);
  const doses = doseSnapshot.docs.flatMap((document) => {
    const parsed = doseSchema.safeParse(document.data());
    return parsed.success && parsed.data.localDate === today && ["due", "missed"].includes(parsed.data.state)
      ? [{ id: document.id, ...parsed.data }]
      : [];
  });
  const appointmentDocument = appointmentSnapshot.docs[0];
  const parsedAppointment = appointmentDocument ? appointmentSchema.safeParse(appointmentDocument.data()) : undefined;
  const upcoming = parsedAppointment?.success ? parsedAppointment.data : undefined;
  const currentDose = doses[0];
  return (
    <main id="main-content" className="page-shell elder-mode">
      <p><Link href="/app">Back to circle</Link></p>
      <section className="elder-card" aria-live="polite">
        <p className="muted">Elder Mode · {session.circle.elderName}</p>
        {currentDose ? (
          <>
            <p className="elder-time">{currentDose.localTime}</p>
            <h1>{currentDose.medicationName}</h1>
            <p>{currentDose.strength}</p>
            {currentDose.instructions && <p>Instructions: {currentDose.instructions}</p>}
            {currentDose.state === "missed" && <p className="not-confirmed">Not confirmed yet</p>}
            <ElderActions doseId={currentDose.id} />
            {doses.length > 1 && <p className="helper">One card at a time · {doses.length - 1} more for today</p>}
          </>
        ) : (
          <>
            <h1>All done for now</h1>
            <p>Aaj ke liye abhi sab theek hai.</p>
          </>
        )}
      </section>
      <section className="card">
        <h2>Next appointment</h2>
        {upcoming ? <p><strong>{upcoming.title}</strong> · {new Date(upcoming.scheduledAt).toLocaleString()}</p> : <p>No upcoming appointment.</p>}
      </section>
      {can(session.role, "approveChanges") && <ApprovalList />}
    </main>
  );
}
