import { afterEach, describe, expect, it } from "vitest";
import { renderAppointmentEmail, renderDoseEmail } from "./mail";

afterEach(() => {
  delete process.env.EMAIL_ACTION_SECRET;
  delete process.env.APP_BASE_URL;
});

describe("email content", () => {
  it("uses non-accusatory missed-dose copy, includes medicine context, and escapes HTML", () => {
    process.env.EMAIL_ACTION_SECRET = "t".repeat(32);
    process.env.APP_BASE_URL = "https://dhaaga.example";
    const message = renderDoseEmail({
      circleCode: "ABCD2345",
      doseId: "2026-11-15_08-00_med1",
      medicine: { name: "<Medicine>", strength: "10 mg", instructions: "After food" },
      scheduledAt: "2026-11-15T08:00:00.000Z",
      localDate: "2026-11-15",
      localTime: "13:30",
      timeZone: "Asia/Kolkata",
      kind: "missed",
    });
    expect(message.subject).toContain("Not confirmed yet");
    expect(message.html).toContain("&lt;Medicine&gt;");
    expect(message.html).toContain("After food");
    expect(message.html).toContain("font-size:18px");
    expect(message.text).toContain("Remind me in 15 minutes:");
  });

  it("includes appointment timing in both email formats", () => {
    const message = renderAppointmentEmail({
      title: "Doctor visit",
      clinician: "Dr Rao",
      location: "Clinic",
      notes: "",
      scheduledAt: "2026-11-16T10:00:00.000Z",
      reminder: "24-hour",
    });
    expect(message.html).toContain("24 hours");
    expect(message.text).toContain("Dr Rao");
  });
});
