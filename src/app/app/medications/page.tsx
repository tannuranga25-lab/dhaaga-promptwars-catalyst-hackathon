import Link from "next/link";
import MedicationManager from "@/app/app/medications/medication-manager";
import { can } from "@/lib/permissions";
import { requirePageSession } from "@/lib/require-session";
import SnapToSchedule from "@/app/app/medications/snap-to-schedule";

export default async function MedicationsPage() {
  const session = await requirePageSession("view");
  return (
    <main id="main-content" className="page-shell">
      <p><Link href="/app">Back to circle</Link></p>
      <h1>Medicines</h1>
      <p className="muted">Keep the schedule aligned with the prescription and your care team&apos;s instructions.</p>
      <MedicationManager canEdit={can(session.role, "editMedications")} />
      {can(session.role, "editMedications") && <SnapToSchedule timeZone={session.circle.timezone} />}
    </main>
  );
}
