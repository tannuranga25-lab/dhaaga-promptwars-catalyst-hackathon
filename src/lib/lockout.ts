export const MAX_AUTH_FAILURES = 5;
export const LOCKOUT_MILLISECONDS = 15 * 60 * 1000;

export function isLockedOut(lockedUntil: number, now: number): boolean {
  return lockedUntil > now;
}

export function nextAuthAttempt(
  failures: number,
  now: number,
): { failures: number; lockedUntil: number } {
  const nextFailures = failures + 1;
  return {
    failures: nextFailures,
    lockedUntil: nextFailures >= MAX_AUTH_FAILURES ? now + LOCKOUT_MILLISECONDS : 0,
  };
}

export function failuresAfterLockout(failures: number, lockedUntil: number, now: number): number {
  return lockedUntil > 0 && !isLockedOut(lockedUntil, now) ? 0 : failures;
}
