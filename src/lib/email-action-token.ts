import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const payloadSchema = z.object({
  circleCode: z.string().regex(/^[A-HJ-NP-Z2-9]{8}$/),
  doseId: z.string().min(1).max(180).regex(/^[A-Za-z0-9_-]+$/),
  action: z.enum(["taken", "skipped", "snooze"]),
  expiresAt: z.number().int().positive(),
});

export const EMAIL_ACTION_TTL_SECONDS = 24 * 60 * 60;

function signingSecret(): string {
  const secret = process.env.EMAIL_ACTION_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error("EMAIL_ACTION_SECRET must contain at least 32 characters.");
  }
  return secret;
}

function signature(payload: string): Buffer {
  return createHmac("sha256", signingSecret()).update(payload).digest();
}

export function createEmailActionToken(
  circleCode: string,
  doseId: string,
  action: z.infer<typeof payloadSchema>["action"],
  now = Date.now(),
): string {
  const body = Buffer.from(JSON.stringify({
    circleCode,
    doseId,
    action,
    expiresAt: Math.floor(now / 1000) + EMAIL_ACTION_TTL_SECONDS,
  })).toString("base64url");
  return `${body}.${signature(body).toString("base64url")}`;
}

export function verifyEmailActionToken(
  token: string,
  now = Date.now(),
): z.infer<typeof payloadSchema> {
  const [body, encodedSignature, ...extra] = token.split(".");
  if (!body || !encodedSignature || extra.length > 0) throw new Error("Invalid email action link.");
  const expected = signature(body);
  const actual = Buffer.from(encodedSignature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new Error("Invalid email action link.");
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    throw new Error("Invalid email action link.");
  }
  const payload = payloadSchema.parse(decoded);
  if (payload.expiresAt <= Math.floor(now / 1000)) throw new Error("This email action link has expired.");
  return payload;
}
