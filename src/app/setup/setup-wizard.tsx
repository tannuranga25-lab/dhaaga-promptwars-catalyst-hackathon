"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

type Contact = {
  name: string;
  email: string;
  role: "elder" | "caretaker" | "family";
  notifyMissed: boolean;
};

type CreatedCircle = {
  circleCode: string;
  passcodes: { caretaker: string; family: string };
};

const blankContact = (): Contact => ({
  name: "",
  email: "",
  role: "caretaker",
  notifyMissed: true,
});

export default function SetupWizard() {
  const [step, setStep] = useState(1);
  const [elderName, setElderName] = useState("");
  const [elderPin, setElderPin] = useState("");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [contacts, setContacts] = useState<Contact[]>([blankContact()]);
  const [createdCircle, setCreatedCircle] = useState<CreatedCircle | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  function updateContact(index: number, patch: Partial<Contact>) {
    setContacts((current) => current.map((contact, item) => item === index ? { ...contact, ...patch } : contact));
  }

  async function createCircle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/circles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          elderName,
          elderPin,
          timezone,
          contacts: contacts.filter((contact) => contact.name.trim() || contact.email.trim()),
        }),
      });
      const result = await response.json() as CreatedCircle | { error?: string };
      if (!response.ok || !("circleCode" in result)) {
        setError("error" in result ? result.error ?? "Could not create your circle." : "Could not create your circle.");
        return;
      }
      setCreatedCircle(result);
      setStep(3);
    } catch {
      setError("We could not reach Dhaaga. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copyCredentials() {
    if (!createdCircle) return;
    const text = `Dhaaga circle: ${createdCircle.circleCode}\nCaretaker passcode: ${createdCircle.passcodes.caretaker}\nFamily passcode: ${createdCircle.passcodes.family}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setError("Copy was unavailable. You can still select and copy the passcodes shown here.");
    }
  }

  return (
    <section className="form-card narrow">
      <p className="progress" aria-label={`Step ${step} of 3`}>Step {step} of 3</p>
      {step === 1 && (
        <>
          <h1>Create your care circle</h1>
          <p className="muted">Start with the elder&apos;s details. They stay at the centre of every decision.</p>
          <div className="field">
            <label htmlFor="elder-name">Elder&apos;s name</label>
            <input id="elder-name" autoComplete="name" value={elderName} onChange={(event) => setElderName(event.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="elder-pin">Choose a 6-digit PIN</label>
            <input id="elder-pin" type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{6}" maxLength={6} value={elderPin} onChange={(event) => setElderPin(event.target.value.replace(/\D/g, "").slice(0, 6))} required />
            <p className="helper">Keep this PIN private. Is PIN ko surakshit rakhein.</p>
          </div>
          <div className="field">
            <label htmlFor="timezone">Care circle time zone</label>
            <select id="timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)}>
              <option value="Asia/Kolkata">India Standard Time (Asia/Kolkata)</option>
              <option value="Asia/Dubai">Gulf Standard Time (Asia/Dubai)</option>
              <option value="Europe/London">United Kingdom (Europe/London)</option>
              <option value="America/New_York">Eastern Time (America/New_York)</option>
            </select>
          </div>
          <div className="button-row">
            <button type="button" onClick={() => {
              if (!elderName.trim() || !/^\d{6}$/.test(elderPin)) {
                setError("Enter the elder's name and a 6-digit PIN to continue.");
                return;
              }
              setError("");
              setStep(2);
            }}>Continue</button>
          </div>
        </>
      )}
      {step === 2 && (
        <form onSubmit={createCircle}>
          <h1>Add trusted contacts</h1>
          <p className="muted">Add people who should join the circle. You can continue without contacts.</p>
          {contacts.map((contact, index) => (
            <fieldset className="contact-card" key={index}>
              <legend className="field-label">Contact {index + 1}</legend>
              <div className="field">
                <label htmlFor={`contact-name-${index}`}>Name</label>
                <input id={`contact-name-${index}`} value={contact.name} onChange={(event) => updateContact(index, { name: event.target.value })} />
              </div>
              <div className="field">
                <label htmlFor={`contact-email-${index}`}>Email address</label>
                <input id={`contact-email-${index}`} type="email" autoComplete="email" value={contact.email} onChange={(event) => updateContact(index, { email: event.target.value })} />
              </div>
              <div className="field">
                <label htmlFor={`contact-role-${index}`}>Circle role</label>
                <select id={`contact-role-${index}`} value={contact.role} onChange={(event) => updateContact(index, { role: event.target.value as Contact["role"] })}>
                  <option value="elder">Elder</option>
                  <option value="caretaker">Caretaker</option>
                  <option value="family">Family</option>
                </select>
              </div>
              <label>
                <input type="checkbox" checked={contact.notifyMissed} onChange={(event) => updateContact(index, { notifyMissed: event.target.checked })} style={{ width: "1.25rem", minHeight: "1.25rem", marginRight: "0.5rem" }} />
                Email me about missed doses
              </label>
              {contacts.length > 1 && <div className="button-row"><button className="secondary" type="button" onClick={() => setContacts((current) => current.filter((_, item) => item !== index))}>Remove contact</button></div>}
            </fieldset>
          ))}
          {contacts.length < 20 && <button className="secondary" type="button" onClick={() => setContacts((current) => [...current, blankContact()])}>Add another contact</button>}
          <p className="status" role="status" aria-live="polite">{error}</p>
          <div className="button-row">
            <button className="secondary" type="button" onClick={() => { setError(""); setStep(1); }}>Back</button>
            <button type="submit" disabled={busy}>{busy ? "Creating circle…" : "Create circle"}</button>
          </div>
        </form>
      )}
      {step === 3 && createdCircle && (
        <>
          <h1>Your circle is ready</h1>
          <p>Save the code and passcodes now. Caretaker and family passcodes are shown only this time.</p>
          <p className="helper">Yeh passcodes sirf abhi dikhaye ja rahe hain — inhe surakshit rakhein.</p>
          <h2>Circle code</h2>
          <p className="credential" aria-label="Circle code">{createdCircle.circleCode}</p>
          <h2>Caretaker passcode</h2>
          <p className="credential">{createdCircle.passcodes.caretaker}</p>
          <h2>Family passcode</h2>
          <p className="credential">{createdCircle.passcodes.family}</p>
          <p className="status" role="status" aria-live="polite">{copied ? "Copied. Store these details somewhere safe." : error}</p>
          <div className="button-row">
            <button type="button" onClick={copyCredentials}>Copy details</button>
            <button className="secondary" type="button" onClick={() => window.print()}>Print</button>
            <Link className="button secondary" href={`/login?circleCode=${createdCircle.circleCode}`}>Continue to sign in</Link>
          </div>
        </>
      )}
    </section>
  );
}
