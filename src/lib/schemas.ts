import { z } from "zod";

const timezoneSchema = z.string().min(1).max(100).refine((timezone) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}, "Enter a valid time zone.");

export const roleSchema = z.enum(["elder", "caretaker", "family"]);
export const autonomySchema = z.enum(["direct", "approval"]);

export const contactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email(),
  role: roleSchema,
  notifyMissed: z.boolean().default(true),
});

export const passcodeHashesSchema = z.object({
  elder: z.string().min(1),
  caretaker: z.string().min(1),
  family: z.string().min(1),
});

export const circleSchema = z.object({
  elderName: z.string().trim().min(1).max(100),
  timezone: timezoneSchema.default("Asia/Kolkata"),
  graceMinutes: z.number().int().min(0).max(1440).default(30),
  autonomy: autonomySchema.default("direct"),
  passcodeHashes: passcodeHashesSchema,
  passcodeVersion: z.number().int().positive(),
  contacts: z.array(contactSchema).max(20),
  createdAt: z.string().datetime(),
});

export const authAttemptSchema = z.object({
  failures: z.number().int().nonnegative(),
  lockedUntil: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
});

export const SUBCOLLECTIONS = [
  "medications",
  "doses",
  "appointments",
  "pendingChanges",
  "audit",
  "authAttempts",
] as const;

export const createCircleSchema = z.object({
  elderName: z.string().trim().min(1).max(100),
  elderPin: z.string().regex(/^\d{6}$/),
  timezone: timezoneSchema.default("Asia/Kolkata"),
  contacts: z.array(contactSchema).max(20),
});

export const loginSchema = z.object({
  circleCode: z.string().trim().toUpperCase().regex(/^[A-HJ-NP-Z2-9]{4}-?[A-HJ-NP-Z2-9]{4}$/),
  passcode: z.string().min(6).max(8),
});

export type Role = z.infer<typeof roleSchema>;
export type Circle = z.infer<typeof circleSchema>;
export type Contact = z.infer<typeof contactSchema>;
