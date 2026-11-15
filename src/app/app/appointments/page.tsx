import Link from "next/link";
import AppointmentManager from "@/app/app/appointments/appointment-manager";
import { can } from "@/lib/permissions";
import { requirePageSession } from "@/lib/require-session";

export default async function AppointmentsPage() {
  const session = await requirePageSession("view");
  return (
    <main id="main-content" className="page-shell">
      <p><Link href="/app">Back to circle</Link></p>
      <h1>Appointments</h1>
      <p className="muted">Keep upcoming visits visible to the people in your care circle.</p>
      <AppointmentManager canEdit={can(session.role, "editAppointments")} />
    </main>
  );
}
