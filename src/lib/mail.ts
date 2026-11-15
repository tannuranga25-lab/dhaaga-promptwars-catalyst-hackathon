import nodemailer from "nodemailer";
import { createEmailActionToken } from "./email-action-token";

type MailContent = { subject: string; html: string; text: string };
export type DoseMailInput = {
  circleCode: string;
  doseId: string;
  medicine: { name: string; strength: string; instructions: string };
  scheduledAt: string;
  localDate: string;
  localTime: string;
  timeZone: string;
  kind: "upcoming" | "missed" | "snooze";
  snoozeUsed?: boolean;
};

function escapeHtml(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function actionUrl(circleCode: string, doseId: string, action: "taken" | "skipped" | "snooze"): string {
  const base = process.env.APP_BASE_URL;
  if (!base) throw new Error("APP_BASE_URL is required to send email actions.");
  const url = new URL("/email-action", base);
  url.searchParams.set("token", createEmailActionToken(circleCode, doseId, action));
  return url.toString();
}

export function renderDoseEmail(input: DoseMailInput): MailContent {
  const medicine = escapeHtml(input.medicine.name);
  const strength = escapeHtml(input.medicine.strength);
  const instructions = escapeHtml(input.medicine.instructions || "No additional instructions provided.");
  const time = `${escapeHtml(input.localDate)} ${escapeHtml(input.localTime)} (${escapeHtml(input.timeZone)})`;
  const missed = input.kind === "missed";
  const snooze = input.kind === "snooze";
  const title = missed ? "Not confirmed yet" : snooze ? "A reminder you requested" : "Medicine reminder";
  const lead = missed
    ? "This dose is not confirmed yet. If it has already been taken, you can update it below."
    : snooze ? "You asked Dhaaga to remind you about this dose." : "A scheduled medicine time is coming up in about 15 minutes.";
  const links: ReadonlyArray<readonly [string, "taken" | "skipped" | "snooze"]> = [
    ["Taken / Le li", "taken"],
    ["Skip", "skipped"],
    ...(!input.snoozeUsed ? [["Remind me in 15 minutes", "snooze"] as const] : []),
  ];
  const linkHtml = links.map(([label, action]) =>
    `<p><a style="display:inline-block;background:#174437;color:#ffffff;padding:14px 20px;border-radius:8px;font-size:18px;text-decoration:none" href="${escapeHtml(actionUrl(input.circleCode, input.doseId, action))}">${label}</a></p>`
  ).join("");
  const textLinks = links.map(([label, action]) =>
    `${label}: ${actionUrl(input.circleCode, input.doseId, action)}`
  ).join("\n");
  return {
    subject: missed ? "Dhaaga: Not confirmed yet" : snooze ? "Dhaaga: Your requested reminder" : "Dhaaga: Medicine reminder",
    html: `<div style="font-family:Arial,sans-serif;font-size:18px;line-height:1.55;color:#20342f"><h1 style="font-size:24px;color:#174437">${title}</h1><p>${lead}</p><p><strong>Medicine:</strong> ${medicine}<br><strong>Strength:</strong> ${strength}<br><strong>Scheduled:</strong> ${time}<br><strong>Instructions:</strong> ${instructions}</p>${linkHtml}<p style="font-size:18px">If you are unsure, please check the prescription or ask the care team. Dhaaga does not provide medical advice.</p></div>`,
    text: `${title}\n\n${lead}\n\nMedicine: ${input.medicine.name}\nStrength: ${input.medicine.strength}\nScheduled: ${input.localDate} ${input.localTime} (${input.timeZone})\nInstructions: ${input.medicine.instructions || "No additional instructions provided."}\n\n${textLinks}\n\nDhaaga does not provide medical advice.`,
  };
}

export function renderAppointmentEmail(input: {
  title: string;
  clinician: string;
  location: string;
  notes: string;
  scheduledAt: string;
  reminder: "24-hour" | "2-hour";
}): MailContent {
  const when = escapeHtml(input.scheduledAt);
  const clinician = escapeHtml(input.clinician || "Not specified");
  const location = escapeHtml(input.location || "Not specified");
  const notes = escapeHtml(input.notes || "No additional notes.");
  const lead = `A doctor appointment is coming up in about ${input.reminder === "24-hour" ? "24 hours" : "2 hours"}.`;
  return {
    subject: `Dhaaga: Appointment in ${input.reminder === "24-hour" ? "24 hours" : "2 hours"}`,
    html: `<div style="font-family:Arial,sans-serif;font-size:18px;line-height:1.55;color:#20342f"><h1 style="font-size:24px;color:#174437">Appointment reminder</h1><p>${lead}</p><p><strong>Appointment:</strong> ${escapeHtml(input.title)}<br><strong>Clinician:</strong> ${clinician}<br><strong>When:</strong> ${when}<br><strong>Location:</strong> ${location}<br><strong>Notes:</strong> ${notes}</p></div>`,
    text: `Appointment reminder\n\n${lead}\n\nAppointment: ${input.title}\nClinician: ${input.clinician || "Not specified"}\nWhen: ${input.scheduledAt}\nLocation: ${input.location || "Not specified"}\nNotes: ${input.notes || "No additional notes."}`,
  };
}

export async function sendMail(to: string, content: MailContent): Promise<{ dryRun: boolean }> {
  const user = process.env.GMAIL_USER;
  const password = process.env.GMAIL_APP_PASSWORD;
  if (!user || !password) return { dryRun: true };
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass: password },
  });
  await transporter.sendMail({ from: user, to, ...content });
  return { dryRun: false };
}

export async function sendHelpRequest(to: string, elderName: string): Promise<{ dryRun: boolean }> {
  const safeName = escapeHtml(elderName);
  return sendMail(to, {
    subject: "Dhaaga: A care circle member needs help",
    html: `<div style="font-family:Arial,sans-serif;font-size:18px;line-height:1.55;color:#20342f"><h1 style="color:#174437">A care circle member needs help</h1><p>${safeName} asked their caretakers to get in touch.</p><p>Please contact them using your usual care plan. Dhaaga does not provide medical advice.</p></div>`,
    text: `${elderName} asked their caretakers to get in touch.\nPlease contact them using your usual care plan. Dhaaga does not provide medical advice.`,
  });
}
