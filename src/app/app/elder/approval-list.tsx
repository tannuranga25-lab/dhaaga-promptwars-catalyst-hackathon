"use client";

import { useEffect, useState } from "react";

type PendingChange = {
  id: string;
  type: "create" | "update" | "delete";
  medicationId?: string;
  requestedBy: string;
  payload?: { name: string; strength: string };
  patch?: { name?: string; strength?: string };
};

export default function ApprovalList() {
  const [changes, setChanges] = useState<PendingChange[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/circle/changes");
    const result = await response.json() as { changes?: PendingChange[]; error?: string };
    if (!response.ok) throw new Error(result.error ?? "Could not load approvals.");
    setChanges(result.changes ?? []);
  }

  useEffect(() => {
    load().catch(() => setMessage("Approvals could not be loaded. Please refresh."));
  }, []);

  async function decide(changeId: string, decision: "approve" | "reject") {
    setMessage("");
    try {
      const response = await fetch(`/api/circle/changes?id=${encodeURIComponent(changeId)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "This decision could not be saved.");
        return;
      }
      setMessage(decision === "approve" ? "Change approved." : "Change declined.");
      await load();
    } catch {
      setMessage("We could not reach Dhaaga. Please try again.");
    }
  }

  return (
    <section className="card" id="approvals">
      <h2>Changes waiting for your review</h2>
      {changes.length === 0 ? <p>No changes need your review.</p> : (
        <ul className="manager-list">
          {changes.map((change) => (
            <li key={change.id}>
              <strong>{change.type} medicine change</strong>
              <p>{change.payload?.name ?? change.patch?.name ?? "Medicine"} · {change.payload?.strength ?? change.patch?.strength ?? "details"}</p>
              <p>Requested by {change.requestedBy}</p>
              <div className="button-row">
                <button type="button" onClick={() => decide(change.id, "approve")}>Approve</button>
                <button type="button" className="secondary" onClick={() => decide(change.id, "reject")}>Decline</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="status" role="status" aria-live="polite">{message}</p>
    </section>
  );
}
