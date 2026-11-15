"use client";

import { useEffect, useState, type FormEvent } from "react";

type Appointment = {
  id: string;
  title: string;
  clinician: string;
  location: string;
  notes: string;
  scheduledAt: string;
};

type AppointmentForm = Omit<Appointment, "id" | "scheduledAt"> & { scheduledAt: string };
const emptyForm = (): AppointmentForm => ({ title: "", clinician: "", location: "", notes: "", scheduledAt: "" });

function asLocalInput(value: string): string {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export default function AppointmentManager({ canEdit }: { canEdit: boolean }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [values, setValues] = useState<AppointmentForm>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/appointments");
    const result = await response.json() as { appointments?: Appointment[]; error?: string };
    if (!response.ok) throw new Error(result.error ?? "Could not load appointments.");
    setAppointments(result.appointments ?? []);
  }

  useEffect(() => {
    load().catch(() => setMessage("Appointments could not be loaded. Please refresh and try again."));
  }, []);

  function edit(appointment: Appointment) {
    setEditingId(appointment.id);
    setValues({ ...appointment, scheduledAt: asLocalInput(appointment.scheduledAt) });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const body = { ...values, scheduledAt: new Date(values.scheduledAt).toISOString() };
      const response = await fetch(editingId ? `/api/appointments/${encodeURIComponent(editingId)}` : "/api/appointments", {
        method: editingId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "Appointment could not be saved.");
        return;
      }
      setMessage("Appointment saved.");
      setEditingId(null);
      setValues(emptyForm());
      await load();
    } catch {
      setMessage("We could not reach Dhaaga. Please check the appointment time.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(appointment: Appointment) {
    if (!window.confirm(`Remove appointment: ${appointment.title}?`)) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/appointments/${encodeURIComponent(appointment.id)}`, { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "Appointment could not be removed.");
        return;
      }
      setMessage("Appointment removed.");
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
        <h2>Upcoming appointments</h2>
        {appointments.length === 0 ? <p>No upcoming appointments.</p> : (
          <ul className="manager-list">
            {appointments.map((appointment) => (
              <li key={appointment.id}>
                <h3>{appointment.title}</h3>
                <p>{new Date(appointment.scheduledAt).toLocaleString()}</p>
                {appointment.clinician && <p>{appointment.clinician}</p>}
                {appointment.location && <p>{appointment.location}</p>}
                {appointment.notes && <p>{appointment.notes}</p>}
                {canEdit && (
                  <div className="button-row compact-actions">
                    <button className="secondary" type="button" disabled={busy} onClick={() => edit(appointment)}>Edit</button>
                    <button className="secondary" type="button" disabled={busy} onClick={() => remove(appointment)}>Remove</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      {canEdit && (
        <section className="form-card">
          <h2>{editingId ? "Edit appointment" : "Add an appointment"}</h2>
          <form onSubmit={save}>
            <div className="field"><label htmlFor="appointment-title">Appointment</label><input id="appointment-title" value={values.title} onChange={(event) => setValues((value) => ({ ...value, title: event.target.value }))} maxLength={120} required /></div>
            <div className="field"><label htmlFor="appointment-clinician">Clinician</label><input id="appointment-clinician" value={values.clinician} onChange={(event) => setValues((value) => ({ ...value, clinician: event.target.value }))} maxLength={120} /></div>
            <div className="field"><label htmlFor="appointment-time">Date and time</label><input id="appointment-time" type="datetime-local" value={values.scheduledAt} onChange={(event) => setValues((value) => ({ ...value, scheduledAt: event.target.value }))} required /></div>
            <div className="field"><label htmlFor="appointment-location">Location</label><input id="appointment-location" value={values.location} onChange={(event) => setValues((value) => ({ ...value, location: event.target.value }))} maxLength={200} /></div>
            <div className="field"><label htmlFor="appointment-notes">Notes</label><textarea id="appointment-notes" rows={3} value={values.notes} onChange={(event) => setValues((value) => ({ ...value, notes: event.target.value }))} maxLength={500} /></div>
            <p className="status" role="status" aria-live="polite">{message}</p>
            <div className="button-row">
              <button type="submit" disabled={busy}>{busy ? "Saving…" : editingId ? "Save appointment" : "Add appointment"}</button>
              {editingId && <button type="button" className="secondary" onClick={() => { setEditingId(null); setValues(emptyForm()); }}>Cancel edit</button>}
            </div>
          </form>
        </section>
      )}
      {!canEdit && <p className="helper">This circle is read-only for your role.</p>}
    </div>
  );
}
