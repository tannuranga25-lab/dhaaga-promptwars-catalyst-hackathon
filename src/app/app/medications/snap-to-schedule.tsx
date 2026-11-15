"use client";

import { useState } from "react";
import type { SnapDraft } from "@/lib/gemini";
import { localDateAt } from "@/lib/time";

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1600;

async function resizeImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser could not prepare the photo. You can enter the details manually.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, file.type, 0.9));
  if (!blob) throw new Error("This browser could not prepare the photo. You can enter the details manually.");
  if (blob.size > MAX_FILE_BYTES) throw new Error("The resized photo is still larger than 4 MB. Choose a smaller image.");
  return new File([blob], file.name, { type: blob.type || file.type });
}

function endDateAfter(startDate: string, durationDays: number | null): string | undefined {
  if (!durationDays) return undefined;
  return new Date(Date.parse(`${startDate}T00:00:00.000Z`) + (durationDays - 1) * 86_400_000)
    .toISOString().slice(0, 10);
}

export default function SnapToSchedule({ timeZone }: { timeZone: string }) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [draft, setDraft] = useState<SnapDraft | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function scan() {
    if (!photo) {
      setMessage("Choose a JPEG, PNG, or WebP prescription photo first.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(photo.type) || photo.size > MAX_FILE_BYTES) {
      setMessage("Choose a JPEG, PNG, or WebP image no larger than 4 MB.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const resized = await resizeImage(photo);
      const data = new FormData();
      data.append("photo", resized);
      const response = await fetch("/api/ai/snap", { method: "POST", body: data });
      const result = await response.json() as { draft?: SnapDraft; error?: string };
      if (!response.ok || !result.draft) {
        setMessage(result.error ?? "Photo reading did not work. Please enter the details manually.");
        return;
      }
      setDraft(result.draft);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Photo reading did not work. Please enter the details manually.");
    } finally {
      setBusy(false);
    }
  }

  function updateMedicine(index: number, patch: Partial<SnapDraft["medicines"][number]>) {
    setDraft((current) => current && ({
      ...current,
      medicines: current.medicines.map((medicine, item) => item === index ? { ...medicine, ...patch } : medicine),
    }));
  }

  async function confirmDraft() {
    if (!draft) return;
    setBusy(true);
    setMessage("");
    const startDate = localDateAt(new Date(), timeZone);
    const medications = draft.medicines.map((medicine) => ({
      name: medicine.name,
      strength: medicine.strength,
      form: medicine.form,
      instructions: medicine.instructions,
      times: medicine.times,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      startDate,
      endDate: endDateAfter(startDate, medicine.durationDays),
      critical: false,
      paused: false,
    }));
    try {
      const response = await fetch("/api/medications/batch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source: "photo", medications }),
      });
      const result = await response.json() as { error?: string; status?: string; count?: number };
      if (!response.ok) {
        setMessage(result.error ?? "The reviewed draft could not be saved.");
        return;
      }
      setMessage(result.status === "pending"
        ? `${result.count} medicine change(s) sent to the elder for approval.`
        : `${result.count} medicine(s) saved.`);
      setDraft(null);
      setPhoto(null);
    } catch {
      setMessage("We could not reach Dhaaga. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h2>Snap-to-Schedule</h2>
      <p>Upload a prescription photo to prepare a draft. The photo is sent only for this reading and is not saved.</p>
      <p className="helper">AI sirf likhi hui jaankari ka draft banata hai; har baat ko prescription se milayein.</p>
      <div className="field">
        <label htmlFor="prescription-photo">Prescription photo (JPEG, PNG, or WebP; up to 4 MB)</label>
        <input id="prescription-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
          setPhoto(event.target.files?.[0] ?? null);
          setDraft(null);
          setMessage("");
        }} />
      </div>
      <button type="button" disabled={busy || !photo} onClick={scan}>{busy ? "Reading photo…" : "Prepare draft"}</button>
      {draft && (
        <div className="draft-review">
          <div className="notice" role="note">
            This is a draft read by AI. Please check each medicine against the prescription.
          </div>
          {draft.medicines.map((medicine, index) => (
            <fieldset className="contact-card" key={index}>
              <legend className="field-label">Medicine draft {index + 1}</legend>
              {medicine.confidence !== "high" && <p className="confidence-label">Please review: {medicine.confidence} confidence.</p>}
              <div className="field"><label htmlFor={`draft-name-${index}`}>Name</label><input id={`draft-name-${index}`} value={medicine.name} onChange={(event) => updateMedicine(index, { name: event.target.value })} /></div>
              <div className="field"><label htmlFor={`draft-strength-${index}`}>Strength as read</label><input id={`draft-strength-${index}`} value={medicine.strength} onChange={(event) => updateMedicine(index, { strength: event.target.value })} /></div>
              <div className="field"><label htmlFor={`draft-form-${index}`}>Form</label><input id={`draft-form-${index}`} value={medicine.form} onChange={(event) => updateMedicine(index, { form: event.target.value })} /></div>
              <div className="field"><label htmlFor={`draft-frequency-${index}`}>Frequency text</label><input id={`draft-frequency-${index}`} value={medicine.frequencyText} onChange={(event) => updateMedicine(index, { frequencyText: event.target.value })} /></div>
              <div className="field"><label htmlFor={`draft-times-${index}`}>Scheduled times (comma separated)</label><input id={`draft-times-${index}`} value={medicine.times.join(", ")} onChange={(event) => updateMedicine(index, { times: event.target.value.split(",").map((time) => time.trim()).filter(Boolean) })} /></div>
              <div className="field"><label htmlFor={`draft-instructions-${index}`}>Instructions</label><textarea id={`draft-instructions-${index}`} value={medicine.instructions} onChange={(event) => updateMedicine(index, { instructions: event.target.value })} rows={3} /></div>
              <div className="field"><label htmlFor={`draft-duration-${index}`}>Duration in days (optional)</label><input id={`draft-duration-${index}`} type="number" min={1} max={730} value={medicine.durationDays ?? ""} onChange={(event) => updateMedicine(index, { durationDays: event.target.value ? Number(event.target.value) : null })} /></div>
              <div className="field"><label htmlFor={`draft-confidence-${index}`}>Reading confidence</label><select id={`draft-confidence-${index}`} value={medicine.confidence} onChange={(event) => updateMedicine(index, { confidence: event.target.value as typeof medicine.confidence })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
              <div className="field"><label htmlFor={`draft-doctor-${index}`}>Doctor name (if legible)</label><input id={`draft-doctor-${index}`} value={medicine.doctorName} onChange={(event) => updateMedicine(index, { doctorName: event.target.value })} /></div>
              <div className="field"><label htmlFor={`draft-warnings-${index}`}>Reading notes (one per line)</label><textarea id={`draft-warnings-${index}`} value={medicine.warnings.join("\n")} onChange={(event) => updateMedicine(index, { warnings: event.target.value.split("\n") })} rows={3} /></div>
            </fieldset>
          ))}
          <button type="button" disabled={busy} onClick={confirmDraft}>{busy ? "Saving…" : "Confirm reviewed draft"}</button>
        </div>
      )}
      <p className="status" role="status" aria-live="polite">{message}</p>
    </section>
  );
}
