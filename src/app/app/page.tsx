import Link from "next/link";
import DoseActionButtons from "@/app/app/dose-action-buttons";
import { computeAdherence } from "@/lib/adherence";
import { can } from "@/lib/permissions";
import { getFirestore } from "@/lib/db";
import { appointmentSchema, doseSchema, medicationSchema } from "@/lib/schemas";
import { localDateAt } from "@/lib/time";
import { requirePageSession } from "@/lib/require-session";

const roleLabels = {
  elder: "Elder",
  caretaker: "Caretaker",
  family: "Family",
} as const;

export default async function CircleHomePage() {
  const session = await requirePageSession("view");
  const db = getFirestore();
  const circle = db.collection("circles").doc(session.circleCode);
  const now = new Date();
  const today = localDateAt(now, session.circle.timezone);
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60_000).toISOString();
  const [medicationSnapshot, doseSnapshot, appointmentSnapshot, pendingSnapshot] = await Promise.all([
    circle.collection("medications").limit(100).get(),
    circle.collection("doses").where("scheduledAt", ">=", weekStart)
      .orderBy("scheduledAt", "desc").limit(500).get(),
    circle.collection("appointments").where("scheduledAt", ">=", now.toISOString())
      .orderBy("scheduledAt").limit(3).get(),
    session.role === "elder"
      ? circle.collection("pendingChanges").where("status", "==", "pending").limit(20).get()
      : Promise.resolve(null),
  ]);
  const medications = medicationSnapshot.docs.flatMap((document) => {
    const parsed = medicationSchema.safeParse(document.data());
    return parsed.success ? [{ id: document.id, ...parsed.data }] : [];
  });
  const doses = doseSnapshot.docs.flatMap((document) => {
    const parsed = doseSchema.safeParse(document.data());
    return parsed.success ? [{ id: document.id, ...parsed.data }] : [];
  });
  const todayDoses = doses.filter((dose) => dose.localDate === today);
  const appointments = appointmentSnapshot.docs.flatMap((document) => {
    const parsed = appointmentSchema.safeParse(document.data());
    return parsed.success ? [{ id: document.id, ...parsed.data }] : [];
  });
  const adherence = computeAdherence(doses);
  const groups = [
    { title: "Morning", matches: (time: string) => Number(time.slice(0, 2)) < 12 },
    { title: "Afternoon", matches: (time: string) => Number(time.slice(0, 2)) >= 12 && Number(time.slice(0, 2)) < 17 },
    { title: "Evening", matches: (time: string) => Number(time.slice(0, 2)) >= 17 },
  ];
  return (
    <main id="main-content" className="page-shell">
      <section className="dashboard-heading">
        <div>
          <p className="muted">Your care circle · {roleLabels[session.role]}</p>
          <h1>Hello, {session.circle.elderName}</h1>
          <p className="helper">Aapke circle mein aapka swagat hai.</p>
        </div>
        <nav className="button-row" aria-label="Circle tools">
          <Link className="button secondary" href="/app/medications">Medicines</Link>
          <Link className="button secondary" href="/app/appointments">Appointments</Link>
          {can(session.role, "viewAudit") && <Link className="button secondary" href="/app/activity">Activity</Link>}
          {session.role === "elder" && <Link className="button secondary" href="/app/elder">Elder Mode</Link>}
          {session.role === "elder" && <Link className="button secondary" href="/app/circle">Circle settings</Link>}
        </nav>
      </section>
      <section className="dashboard-grid">
        <article className="card stat-card">
          <h2>7-day adherence</h2>
          <p className="stat-number">{adherence.adherencePercent}%</p>
          <p>{adherence.taken} of {adherence.expected} recorded doses taken</p>
          <p className="muted">On time: {adherence.onTimePercent}%</p>
        </article>
        <article className="card stat-card">
          <h2>Next appointment</h2>
          {appointments[0] ? (
            <>
              <p><strong>{appointments[0].title}</strong></p>
              <p>{new Date(appointments[0].scheduledAt).toLocaleString()}</p>
            </>
          ) : <p>No upcoming appointments.</p>}
        </article>
      </section>
      {pendingSnapshot && pendingSnapshot.size > 0 && (
        <section className="card" aria-labelledby="pending-title">
          <h2 id="pending-title">Changes waiting for your review</h2>
          <p>{pendingSnapshot.size} medicine change(s) are waiting for your approval.</p>
          <Link className="button" href="/app/elder#approvals">Review in Elder Mode</Link>
        </section>
      )}
      <section className="card">
        <h2>Today&apos;s timeline</h2>
        {todayDoses.length === 0 ? <p>No doses scheduled for today yet.</p> : groups.map((group) => {
          const entries = todayDoses.filter((dose) => group.matches(dose.localTime));
          if (entries.length === 0) return null;
          return (
            <section key={group.title} className="timeline-group">
              <h3>{group.title}</h3>
              <ul className="timeline-list">
                {entries.map((dose) => (
                  <li className="timeline-item" key={dose.id}>
                    <div>
                      <strong>{dose.localTime} · {dose.medicationName}</strong>
                      <p>{dose.strength} · {dose.state === "missed" ? "Not confirmed yet" : dose.state.replace("_", " ")}</p>
                    </div>
                    {can(session.role, "logDose") && (dose.state === "due" || dose.state === "missed") && (
                      <DoseActionButtons doseId={dose.id} />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </section>
      <section className="card">
        <h2>Medicines in this circle</h2>
        {medications.length === 0 ? <p>No medicines added yet.</p> : (
          <ul className="simple-list">
            {medications.map((medication) => (
              <li key={medication.id}>
                <strong>{medication.name}</strong> · {medication.strength} · {medication.form}
                {medication.paused && <span className="status-chip">Paused</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
      <form action="/api/logout" method="post" className="button-row">
        <button className="secondary" type="submit">Sign out</button>
      </form>
    </main>
  );
}
