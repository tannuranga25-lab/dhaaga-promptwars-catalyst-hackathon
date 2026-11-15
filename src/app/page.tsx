import Link from "next/link";
import DemoAccessButton from "@/app/demo/demo-access-button";

export default function HomePage() {
  return (
    <main id="main-content" className="page-shell hero">
      <section>
        <p className="muted">A little more connected care</p>
        <h1>Care feels lighter when it is shared.</h1>
        <p>
          Bring your family and care team together around one simple circle.
          The elder stays in charge, and everyone knows how to help.
        </p>
        <div className="hero-actions">
          <Link className="button" href="/setup">Create a circle</Link>
          <Link className="button secondary" href="/login">Join with code + passcode</Link>
          <DemoAccessButton />
        </div>
      </section>
      <aside className="hero-note" aria-label="How Dhaaga supports a care circle">
        <strong>One circle. Shared support.</strong>
        <p>Keep medication routines and appointment details together, with permissions chosen for your family.</p>
        <p className="helper">Aapka apna care circle — faisle buzurg ke saath.</p>
      </aside>
    </main>
  );
}
