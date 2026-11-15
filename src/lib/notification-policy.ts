import type { Contact } from "@/lib/schemas";

const MINUTE = 60_000;

export function isWithinNotificationWindow(
  scheduledAt: number,
  leadTimeMilliseconds: number,
  now: number,
): boolean {
  const sendAt = scheduledAt - leadTimeMilliseconds;
  return now >= sendAt && now < sendAt + MINUTE;
}

export function missedDoseGraceMilliseconds(graceMinutes: number, critical: boolean): number {
  const effectiveGrace = critical ? Math.max(10, Math.floor(graceMinutes / 2)) : graceMinutes;
  return effectiveGrace * MINUTE;
}

export function missedDoseRecipients(
  contacts: ReadonlyArray<Contact>,
  critical: boolean,
  missedAt: number,
  graceMilliseconds: number,
  now: number,
): Contact[] {
  if (now < missedAt + graceMilliseconds) return [];
  const notify = contacts.filter((contact) =>
    contact.role === "elder" || (contact.role === "caretaker" && contact.notifyMissed)
  );
  const familyEscalationReady = critical && now >= missedAt + graceMilliseconds * 2;
  return familyEscalationReady
    ? [...notify, ...contacts.filter((contact) => contact.role === "family" && contact.notifyMissed)]
    : notify;
}

export type NotificationClaim = { attempts: number; claimedAt?: number; sentAt?: number };

export function canClaimNotification(
  claim: NotificationClaim | undefined,
  now: number,
  retryAfterMilliseconds = MINUTE,
): boolean {
  if (!claim) return true;
  if (claim.sentAt !== undefined || claim.attempts >= 3) return false;
  return claim.claimedAt === undefined || now - claim.claimedAt >= retryAfterMilliseconds;
}

export function nextNotificationClaim(
  claim: NotificationClaim | undefined,
  now: number,
): NotificationClaim {
  return { attempts: (claim?.attempts ?? 0) + 1, claimedAt: now };
}
