import { describe, expect, it, vi } from "vitest";
import { parseDraftWithRetry } from "./gemini";

const validDraft = JSON.stringify({
  medicines: [{
    name: "Example medicine",
    strength: "10 mg",
    form: "tablet",
    frequencyText: "As written",
    times: ["08:00"],
    instructions: "As written on prescription",
    durationDays: 7,
    confidence: "medium",
    doctorName: "Dr Example",
    warnings: [],
  }],
});

describe("prescription draft validation", () => {
  it("retries once when the first structured response is invalid", async () => {
    const generate = vi.fn().mockResolvedValueOnce('{"medicines": []}').mockResolvedValueOnce(validDraft);
    await expect(parseDraftWithRetry(generate)).resolves.toMatchObject({
      medicines: [{ name: "Example medicine", confidence: "medium" }],
    });
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it("does not retry model transport errors and rejects invalid output after one retry", async () => {
    const failed = vi.fn().mockRejectedValue(new Error("network unavailable"));
    await expect(parseDraftWithRetry(failed)).rejects.toThrow("network unavailable");
    expect(failed).toHaveBeenCalledTimes(1);

    const invalid = vi.fn().mockResolvedValue('{"medicines": []}');
    await expect(parseDraftWithRetry(invalid)).rejects.toThrow(/manually/i);
    expect(invalid).toHaveBeenCalledTimes(2);
  });
});
