"use client";

import { useState } from "react";

export default function DoseActionButtons({ doseId }: { doseId: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function act(action: "taken" | "skipped") {
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
        setMessage(result.error ?? "This dose could not be updated.");
        return;
      }
      setMessage(action === "taken" ? "Taken update saved." : "Skipped update saved.");
      window.location.reload();
    } catch {
      setMessage("We could not reach Dhaaga. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="button-row compact-actions">
        <button type="button" disabled={busy} onClick={() => act("taken")}>Taken / Le li</button>
        <button type="button" className="secondary" disabled={busy} onClick={() => act("skipped")}>Not yet / Abhi nahi</button>
      </div>
      <p className="status" role="status" aria-live="polite">{message}</p>
    </div>
  );
}
