"use client";

import { useState } from "react";

export default function DemoAccessButton() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function enterDemo() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/demo-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "The demo could not be opened.");
        return;
      }
      window.location.assign("/app");
    } catch {
      setMessage("We could not reach Dhaaga. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" disabled={busy} onClick={enterDemo}>{busy ? "Opening demo…" : "Try the demo"}</button>
      <p className="status" role="status" aria-live="polite">{message}</p>
    </>
  );
}
