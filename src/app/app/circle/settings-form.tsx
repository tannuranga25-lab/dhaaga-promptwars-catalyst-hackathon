"use client";

import { useState } from "react";

type Contact = {
  name: string;
  email: string;
  role: "elder" | "caretaker" | "family";
  notifyMissed: boolean;
};

type Credentials = { caretaker: string; family: string };

export default function CircleSettingsForm({
  initialAutonomy,
  initialContacts,
}: {
  initialAutonomy: "direct" | "approval";
  initialContacts: Contact[];
}) {
  const [autonomy, setAutonomy] = useState(initialAutonomy);
  const [contacts, setContacts] = useState(initialContacts);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function updateContact(index: number, patch: Partial<Contact>) {
    setContacts((current) => current.map((contact, item) => item === index ? { ...contact, ...patch } : contact));
  }

  async function saveSettings() {
    setBusy(true);
    setMessage("");
    setCredentials(null);
    try {
      const response = await fetch("/api/circle/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ autonomy, contacts }),
      });
      const result = await response.json() as { error?: string };
      setMessage(response.ok ? "Circle settings saved." : result.error ?? "Circle settings could not be saved.");
    } catch {
      setMessage("We could not reach Dhaaga. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function regeneratePasscodes() {
    if (!window.confirm("Old caretaker and family passcodes will stop working. Continue?")) return;
    setBusy(true);
    setCredentials(null);
    setMessage("");
    try {
      const response = await fetch("/api/circle/passcodes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const result = await response.json() as { error?: string; passcodes?: Credentials };
      if (!response.ok || !result.passcodes) {
        setMessage(result.error ?? "Passcodes could not be regenerated.");
        return;
      }
      setCredentials(result.passcodes);
      setMessage("New passcodes are shown once. Share them only with trusted circle members.");
    } catch {
      setMessage("We could not reach Dhaaga. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="manager-layout">
      <section className="form-card">
        <h2>Circle permissions</h2>
        <div className="field">
          <label htmlFor="circle-autonomy">Medicine changes from caretakers</label>
          <select id="circle-autonomy" value={autonomy} onChange={(event) => setAutonomy(event.target.value as typeof autonomy)}>
            <option value="direct">Apply directly</option>
            <option value="approval">Ask me to approve first</option>
          </select>
        </div>
        <h2>Trusted contacts</h2>
        {contacts.map((contact, index) => (
          <fieldset className="contact-card" key={`${contact.email}-${index}`}>
            <legend className="field-label">Contact {index + 1}</legend>
            <div className="field"><label htmlFor={`circle-contact-name-${index}`}>Name</label><input id={`circle-contact-name-${index}`} value={contact.name} onChange={(event) => updateContact(index, { name: event.target.value })} /></div>
            <div className="field"><label htmlFor={`circle-contact-email-${index}`}>Email</label><input id={`circle-contact-email-${index}`} type="email" value={contact.email} onChange={(event) => updateContact(index, { email: event.target.value })} /></div>
            <div className="field">
              <label htmlFor={`circle-contact-role-${index}`}>Role</label>
              <select id={`circle-contact-role-${index}`} value={contact.role} onChange={(event) => updateContact(index, { role: event.target.value as Contact["role"] })}>
                <option value="elder">Elder</option><option value="caretaker">Caretaker</option><option value="family">Family</option>
              </select>
            </div>
            <label className="check-row"><input type="checkbox" checked={contact.notifyMissed} onChange={(event) => updateContact(index, { notifyMissed: event.target.checked })} />Email about missed doses</label>
            <button type="button" className="secondary" onClick={() => setContacts((current) => current.filter((_, item) => item !== index))}>Remove contact</button>
          </fieldset>
        ))}
        {contacts.length < 20 && <button type="button" className="secondary" onClick={() => setContacts((current) => [...current, { name: "", email: "", role: "caretaker", notifyMissed: true }])}>Add a contact</button>}
        <div className="button-row"><button type="button" disabled={busy} onClick={saveSettings}>Save circle settings</button></div>
      </section>
      <section className="card">
        <h2>Passcodes</h2>
        <p>Regenerate caretaker and family passcodes if access needs to change. Old passcodes and sessions stop working immediately.</p>
        <button type="button" className="secondary" disabled={busy} onClick={regeneratePasscodes}>Regenerate passcodes</button>
        {credentials && (
          <div className="credential-panel">
            <h3>Caretaker passcode</h3><p className="credential">{credentials.caretaker}</p>
            <h3>Family passcode</h3><p className="credential">{credentials.family}</p>
          </div>
        )}
        <p className="status" role="status" aria-live="polite">{message}</p>
      </section>
    </div>
  );
}
