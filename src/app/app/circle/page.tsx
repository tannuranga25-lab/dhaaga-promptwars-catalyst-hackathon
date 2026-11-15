import Link from "next/link";
import CircleSettingsForm from "@/app/app/circle/settings-form";
import { requirePageSession } from "@/lib/require-session";

export default async function CircleSettingsPage() {
  const session = await requirePageSession("view");
  if (session.role !== "elder") {
    return (
      <main id="main-content" className="page-shell">
        <section className="card narrow">
          <h1>Circle settings</h1>
          <p>Only the elder can manage circle settings.</p>
          <Link href="/app">Back to circle</Link>
        </section>
      </main>
    );
  }
  return (
    <main id="main-content" className="page-shell">
      <p><Link href="/app">Back to circle</Link></p>
      <h1>Circle settings</h1>
      <p className="muted">You are in control of who can help and which changes need your approval.</p>
      <CircleSettingsForm initialAutonomy={session.circle.autonomy} initialContacts={session.circle.contacts} />
    </main>
  );
}
