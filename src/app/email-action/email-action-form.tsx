"use client";

import { useState } from "react";

export default function EmailActionForm({
  token,
  action,
}: {
  token: string;
  action: "taken" | "skipped" | "snooze";
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function confirmAction() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/email-action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = await response.json() as { error?: string };
      setMessage(response.ok ? "Thank you. This update is recorded." : result.error ?? "This update could not be recorded.");
    } catch {
      setMessage("We could not reach Dhaaga. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const labels = {
    taken: "Confirm taken",
    skipped: "Confirm skipped",
    snooze: "Remind me in 15 minutes",
  };
  return (
    <>
      <button type="button" disabled={busy || Boolean(message)} onClick={confirmAction}>
        {busy ? "Updating…" : labels[action]}
      </button>
      <p className="status" role="status" aria-live="polite">{message}</p>
    </>
  );
}
