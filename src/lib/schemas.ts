import { z } from "zod";

const timezoneSchema = z.string().min(1).max(100).refine((timezone) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}, "Enter a valid time zone.");

const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Enter a valid date.");

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

const medicationObjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  strength: z.string().trim().min(1).max(80),
  form: z.string().trim().min(1).max(80),
  instructions: z.string().trim().max(500).default(""),
  times: z.array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)).min(1).max(12),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  startDate: localDateSchema,
  endDate: localDateSchema.optional(),
  critical: z.boolean().default(false),
  paused: z.boolean().default(false),
});

export const medicationSchema = medicationObjectSchema.refine((medication) => !medication.endDate || medication.endDate >= medication.startDate, {
  message: "End date must be on or after the start date.",
  path: ["endDate"],
}).refine((medication) => new Set(medication.daysOfWeek).size === medication.daysOfWeek.length, {
  message: "Choose each day of the week only once.",
  path: ["daysOfWeek"],
});

export const medicationUpdateSchema = medicationObjectSchema.partial()
  .refine((value) => Object.keys(value).length > 0, "Provide at least one field to update.")
  .refine((value) => !value.startDate || !value.endDate || value.endDate >= value.startDate, {
    message: "End date must be on or after the start date.",
    path: ["endDate"],
  })
  .refine((value) => !value.daysOfWeek || new Set(value.daysOfWeek).size === value.daysOfWeek.length, {
    message: "Choose each day of the week only once.",
    path: ["daysOfWeek"],
  });

export const doseStateSchema = z.enum(["scheduled", "due", "taken", "skipped", "missed", "taken_late"]);
export const doseSchema = z.object({
  medicationId: z.string().min(1).max(128),
  medicationName: z.string().min(1).max(120),
  strength: z.string().min(1).max(80),
  instructions: z.string().max(500),
  scheduledAt: z.string().datetime(),
  localDate: localDateSchema,
  localTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  state: doseStateSchema,
  critical: z.boolean(),
  confirmedAt: z.string().datetime().optional(),
  snoozeUntil: z.string().datetime().optional(),
  snoozeUsed: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const appointmentSchema = z.object({
  title: z.string().trim().min(1).max(120),
  clinician: z.string().trim().max(120).default(""),
  location: z.string().trim().max(200).default(""),
  notes: z.string().trim().max(500).default(""),
  scheduledAt: z.string().datetime(),
});

export const appointmentUpdateSchema = appointmentSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "Provide at least one field to update.",
);

export const pendingChangeSchema = z.object({
  type: z.enum(["create", "update", "delete"]),
  medicationId: z.string().max(128).optional(),
  payload: medicationSchema.optional(),
  patch: medicationUpdateSchema.optional(),
  requestedBy: roleSchema,
  requestedAt: z.string().datetime(),
  status: z.enum(["pending", "approved", "rejected"]),
  reviewedBy: roleSchema.optional(),
  reviewedAt: z.string().datetime().optional(),
});

export const auditSchema = z.object({
  actorRole: z.union([roleSchema, z.literal("email-link"), z.literal("system")]),
  action: z.string().min(1).max(100),
  source: z.enum(["app", "email-link", "photo"]),
  targetId: z.string().max(128).optional(),
  details: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  createdAt: z.string().datetime(),
});

export const createCircleSchema = z.object({
  elderName: z.string().trim().min(1).max(100),
  elderPin: z.string().regex(/^\d{6}$/),
  timezone: timezoneSchema.default("Asia/Kolkata"),
  contacts: z.array(contactSchema).max(20),
});

export const loginSchema = z.object({
  circleCode: z.string().trim().toUpperCase().refine(
    (code) => code === "DEMO-0000" || /^[A-HJ-NP-Z2-9]{4}-?[A-HJ-NP-Z2-9]{4}$/.test(code),
    "Enter a valid circle code.",
  ),
  passcode: z.string().min(6).max(8),
});

export const doseActionSchema = z.object({
  action: z.enum(["taken", "skipped", "snooze"]),
});

export const SUBCOLLECTIONS = [
  "medications",
  "doses",
  "appointments",
  "pendingChanges",
  "audit",
  "authAttempts",
] as const;

export type Role = z.infer<typeof roleSchema>;
export type Circle = z.infer<typeof circleSchema>;
export type Contact = z.infer<typeof contactSchema>;
export type Medication = z.infer<typeof medicationSchema>;
export type Dose = z.infer<typeof doseSchema>;
export type DoseState = z.infer<typeof doseStateSchema>;
export type Appointment = z.infer<typeof appointmentSchema>;
