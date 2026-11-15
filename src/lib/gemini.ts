import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";

export const snapMedicineSchema = z.object({
  name: z.string().trim().min(1).max(120),
  strength: z.string().trim().max(80),
  form: z.string().trim().max(80),
  frequencyText: z.string().trim().max(160),
  times: z.array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)).max(12),
  instructions: z.string().trim().max(500),
  durationDays: z.number().int().min(1).max(730).nullable(),
  confidence: z.enum(["low", "medium", "high"]),
  doctorName: z.string().trim().max(120),
  warnings: z.array(z.string().trim().max(240)).max(10),
});

export const snapDraftSchema = z.object({
  medicines: z.array(snapMedicineSchema).min(1).max(10),
});

export type SnapDraft = z.infer<typeof snapDraftSchema>;

export async function parseDraftWithRetry(generate: () => Promise<string>): Promise<SnapDraft> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const text = await generate();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      if (attempt === 1) throw new Error("The prescription could not be read. Please enter the details manually.");
      continue;
    }
    const parsed = snapDraftSchema.safeParse(json);
    if (parsed.success) return parsed.data;
    if (attempt === 1) throw new Error("The prescription could not be read. Please enter the details manually.");
  }
  throw new Error("The prescription could not be read. Please enter the details manually.");
}

export async function extractPrescriptionDraft(imageBase64: string, mimeType: string): Promise<SnapDraft> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Prescription scanning is not configured.");
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const ai = new GoogleGenAI({ apiKey });
  const schema = {
    type: Type.OBJECT,
    properties: {
      medicines: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            strength: { type: Type.STRING },
            form: { type: Type.STRING },
            frequencyText: { type: Type.STRING },
            times: { type: Type.ARRAY, items: { type: Type.STRING } },
            instructions: { type: Type.STRING },
            durationDays: { type: Type.INTEGER, nullable: true },
            confidence: { type: Type.STRING, enum: ["low", "medium", "high"] },
            doctorName: { type: Type.STRING },
            warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["name", "strength", "form", "frequencyText", "times", "instructions", "durationDays", "confidence", "doctorName", "warnings"],
        },
      },
    },
    required: ["medicines"],
  };
  return parseDraftWithRetry(async () => {
    const response = await ai.models.generateContent({
      model,
      contents: [{
        role: "user",
        parts: [
          {
            text: "Read only what is explicitly legible on this prescription. Return structured transcription, not medical advice. Never infer or suggest a medicine, strength, dose, schedule, interaction, diagnosis, or treatment. Use empty strings or arrays when a field is unclear, low confidence, and a short warning for unreadable text. Return valid JSON matching the schema.",
          },
          { inlineData: { mimeType, data: imageBase64 } },
        ],
      }],
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: schema,
      },
    });
    return response.text ?? "";
  });
}
