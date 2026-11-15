import { requirePageSession } from "@/lib/require-session";

const roleLabels = {
  elder: "Elder",
  caretaker: "Caretaker",
  family: "Family",
} as const;

export default async function CircleHomePage() {
  const session = await requirePageSession("view");
  return (
    <main id="main-content" className="page-shell">
      <section className="card narrow">
        <p className="muted">Your care circle</p>
        <h1>Hello, {session.circle.elderName}</h1>
        <p>You are here as a <strong>{roleLabels[session.role]}</strong>.</p>
        <p className="muted">Your shared care space is ready. More circle tools will appear here as they are set up.</p>
        <p className="helper">Aapke circle mein aapka swagat hai.</p>
        <form action="/api/logout" method="post" className="button-row">
          <button className="secondary" type="submit">Sign out</button>
        </form>
      </section>
    </main>
  );
}
