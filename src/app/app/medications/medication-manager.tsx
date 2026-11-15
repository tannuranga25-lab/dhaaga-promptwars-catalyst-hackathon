"use client";

import { useEffect, useState, type FormEvent } from "react";

type Medication = {
  id: string;
  name: string;
  strength: string;
  form: string;
  instructions: string;
  times: string[];
  daysOfWeek: number[];
  startDate: string;
  endDate?: string;
  critical: boolean;
  paused: boolean;
};

type FormValues = Omit<Medication, "id">;
const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function blankForm(): FormValues {
  return {
    name: "",
    strength: "",
    form: "",
    instructions: "",
    times: ["08:00"],
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    critical: false,
    paused: false,
  };
}

export default function MedicationManager({ canEdit }: { canEdit: boolean }) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [values, setValues] = useState<FormValues>(blankForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/medications");
    const result = await response.json() as { medications?: Medication[]; error?: string };
    if (!response.ok) throw new Error(result.error ?? "Could not load medicines.");
    setMedications(result.medications ?? []);
  }

  useEffect(() => {
    load().catch(() => setMessage("Medicines could not be loaded. Please refresh and try again."));
  }, []);

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function edit(medication: Medication) {
    setEditingId(medication.id);
    setValues({ ...medication, endDate: medication.endDate ?? "" });
    setMessage("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const body = {
      ...values,
      times: values.times.map((time) => time.trim()).filter(Boolean),
      endDate: values.endDate || undefined,
    };
    try {
      const response = await fetch(editingId ? `/api/medications/${encodeURIComponent(editingId)}` : "/api/medications", {
        method: editingId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json() as { error?: string; status?: string };
      if (!response.ok) {
        setMessage(result.error ?? "Medicine could not be saved.");
        return;
      }
      setMessage(result.status === "pending" ? "Change sent to the elder for approval." : "Medicine saved.");
      setEditingId(null);
      setValues(blankForm());
      await load();
    } catch {
      setMessage("We could not reach Dhaaga. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function togglePause(medication: Medication) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/medications/${encodeURIComponent(medication.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paused: !medication.paused }),
      });
      const result = await response.json() as { error?: string; status?: string };
      if (!response.ok) {
        setMessage(result.error ?? "Medicine could not be updated.");
        return;
      }
      setMessage(result.status === "pending" ? "Pause request sent for elder approval." : "Medicine updated.");
      await load();
    } catch {
      setMessage("We could not reach Dhaaga. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(medication: Medication) {
    if (!window.confirm(`Remove ${medication.name} from this care circle?`)) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/medications/${encodeURIComponent(medication.id)}`, { method: "DELETE" });
      const result = await response.json() as { error?: string; status?: string };
      if (!response.ok) {
        setMessage(result.error ?? "Medicine could not be removed.");
        return;
      }
      setMessage(result.status === "pending" ? "Removal sent to the elder for approval." : "Medicine removed.");
      await load();
    } catch {
      setMessage("We could not reach Dhaaga. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="manager-layout">
      <section className="card">
        <h2>Medicine list</h2>
        {medications.length === 0 ? <p>No medicines added yet.</p> : (
          <ul className="manager-list">
            {medications.map((medication) => (
              <li key={medication.id}>
                <h3>{medication.name} <span className="status-chip">{medication.paused ? "Paused" : "Active"}</span></h3>
                <p>{medication.strength} · {medication.form}</p>
                <p>{medication.times.join(", ")} · {medication.daysOfWeek.map((day) => weekdays[day].slice(0, 3)).join(", ")}</p>
                {medication.instructions && <p>Instructions: {medication.instructions}</p>}
                {canEdit && (
                  <div className="button-row compact-actions">
                    <button className="secondary" type="button" disabled={busy} onClick={() => edit(medication)}>Edit</button>
                    <button className="secondary" type="button" disabled={busy} onClick={() => togglePause(medication)}>
                      {medication.paused ? "Resume" : "Pause"}
                    </button>
                    <button className="secondary" type="button" disabled={busy} onClick={() => remove(medication)}>Remove</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      {canEdit && (
        <section className="form-card">
          <h2>{editingId ? "Edit medicine details" : "Add a medicine"}</h2>
          <form onSubmit={save}>
            <div className="field">
              <label htmlFor="medicine-name">Medicine name</label>
              <input id="medicine-name" value={values.name} onChange={(event) => update("name", event.target.value)} required maxLength={120} />
            </div>
            <div className="field">
              <label htmlFor="medicine-strength">Strength as written on the prescription</label>
              <input id="medicine-strength" value={values.strength} onChange={(event) => update("strength", event.target.value)} required maxLength={80} />
            </div>
            <div className="field">
              <label htmlFor="medicine-form">Form</label>
              <input id="medicine-form" value={values.form} onChange={(event) => update("form", event.target.value)} required maxLength={80} placeholder="As written on the prescription" />
            </div>
            <div className="field">
              <label htmlFor="medicine-instructions">Instructions as written</label>
              <textarea id="medicine-instructions" value={values.instructions} onChange={(event) => update("instructions", event.target.value)} maxLength={500} rows={3} />
            </div>
            <div className="field">
              <label htmlFor="medicine-times">Scheduled local times (comma separated)</label>
              <input id="medicine-times" value={values.times.join(", ")} onChange={(event) => update("times", event.target.value.split(","))} required placeholder="08:00, 20:00" />
              <p className="helper">Enter times exactly as agreed with the care team. No dose advice is provided.</p>
            </div>
            <fieldset className="field">
              <legend className="field-label">Days of the week</legend>
              <div className="weekday-grid">
                {weekdays.map((day, index) => (
                  <label key={day}>
                    <input
                      type="checkbox"
                      checked={values.daysOfWeek.includes(index)}
                      onChange={(event) => update("daysOfWeek", event.target.checked
                        ? [...values.daysOfWeek, index].sort()
                        : values.daysOfWeek.filter((selected) => selected !== index))}
                    />
                    {day}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="field">
              <label htmlFor="medicine-start-date">Start date</label>
              <input id="medicine-start-date" type="date" value={values.startDate} onChange={(event) => update("startDate", event.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="medicine-end-date">End date (optional)</label>
              <input id="medicine-end-date" type="date" value={values.endDate ?? ""} onChange={(event) => update("endDate", event.target.value)} />
            </div>
            <label className="check-row">
              <input type="checkbox" checked={values.critical} onChange={(event) => update("critical", event.target.checked)} />
              Mark as critical (as decided by the care team)
            </label>
            <label className="check-row">
              <input type="checkbox" checked={values.paused} onChange={(event) => update("paused", event.target.checked)} />
              Paused
            </label>
            <p className="status" role="status" aria-live="polite">{message}</p>
            <div className="button-row">
              <button type="submit" disabled={busy}>{busy ? "Saving…" : editingId ? "Save changes" : "Add medicine"}</button>
              {editingId && <button className="secondary" type="button" onClick={() => { setEditingId(null); setValues(blankForm()); }}>Cancel edit</button>}
            </div>
          </form>
        </section>
      )}
      {!canEdit && <p className="helper">This circle is read-only for your role.</p>}
    </div>
  );
}
