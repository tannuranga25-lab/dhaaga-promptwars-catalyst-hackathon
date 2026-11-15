import Link from "next/link";
import DemoAccessButton from "./demo-access-button";

export default function DemoPage() {
  return (
    <main id="main-content" className="page-shell">
      <section className="card narrow">
        <p className="muted">Dhaaga demo</p>
        <h1>A calm space for shared care</h1>
        <p>This preview uses a seeded example circle. It does not collect real health information and sends no emails.</p>
        <ul>
          <li>Explore a caretaker view with example medicine schedules and dose history.</li>
          <li>Try appointment tracking, adherence, and elder-controlled approvals.</li>
          <li>The elder remains at the centre of permissions and approvals.</li>
        </ul>
        <p className="helper">Yeh demo data hai; asli health jaankari istemal nahi hoti.</p>
        <div className="button-row">
          <DemoAccessButton />
          <Link className="button secondary" href="/">Back home</Link>
        </div>
      </section>
    </main>
  );
}
