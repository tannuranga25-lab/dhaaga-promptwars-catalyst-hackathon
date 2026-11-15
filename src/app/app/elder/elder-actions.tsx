"use client";

import { useState } from "react";

export default function ElderActions({ doseId }: { doseId: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function updateDose(action: "taken" | "skipped") {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/doses/${encodeURIComponent(doseId)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "We could not save this update.");
        return;
      }
      window.location.reload();
    } catch {
      setMessage("We could not reach Dhaaga. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function askForHelp() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/help", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const result = await response.json() as { error?: string; dryRun?: boolean };
      if (!response.ok) {
        setMessage(result.error ?? "Your care team could not be contacted.");
        return;
      }
      setMessage(result.dryRun ? "Your request is ready. Email is not configured yet." : "Your caretakers have been contacted.");
    } catch {
      setMessage("We could not reach Dhaaga. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="elder-actions">
        <button type="button" disabled={busy} onClick={() => updateDose("taken")}>Taken / Le li</button>
        <button className="secondary" type="button" disabled={busy} onClick={() => updateDose("skipped")}>Not yet / Abhi nahi</button>
        <button className="help-button" type="button" disabled={busy} onClick={askForHelp}>I need help / Madad chahiye</button>
      </div>
      <p className="status" role="status" aria-live="polite">{message}</p>
    </>
  );
}
