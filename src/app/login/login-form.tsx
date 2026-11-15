"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

export default function LoginForm({ initialCircleCode }: { initialCircleCode: string }) {
  const [circleCode, setCircleCode] = useState(initialCircleCode);
  const [passcode, setPasscode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ circleCode, passcode }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "We could not sign you in. Please try again.");
        return;
      }
      window.location.assign("/app");
    } catch {
      setMessage("We could not reach Dhaaga. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="form-card narrow">
      <h1>Welcome to your care circle</h1>
      <p className="muted">Enter the circle code and the passcode shared with you.</p>
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="circle-code">Circle code</label>
          <input id="circle-code" autoCapitalize="characters" autoComplete="off" value={circleCode} onChange={(event) => setCircleCode(event.target.value.toUpperCase())} placeholder="ABCD-EFGH" required />
        </div>
        <div className="field">
          <label htmlFor="passcode">Passcode</label>
          <input id="passcode" type="password" autoComplete="current-password" value={passcode} onChange={(event) => setPasscode(event.target.value.toUpperCase())} minLength={6} maxLength={8} required />
        </div>
        <p className="helper">Aapke circle ke liye diya gaya passcode darj karein.</p>
        <p className="status" role="status" aria-live="polite">{message}</p>
        <div className="button-row">
          <button type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
          <Link className="button secondary" href="/">Back home</Link>
        </div>
      </form>
    </section>
  );
}
