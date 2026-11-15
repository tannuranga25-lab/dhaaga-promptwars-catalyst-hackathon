import type { Medication } from "@/lib/schemas";

export type DoseOccurrence = {
  id: string;
  medicationId: string;
  localDate: string;
  localTime: string;
  scheduledAt: string;
};

function localParts(instant: Date, timeZone: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  };
}

function localTimeToUtc(localDate: string, localTime: string, timeZone: string): Date {
  const [year, month, day] = localDate.split("-").map(Number);
  const [hour, minute] = localTime.split(":").map(Number);
  const targetUtc = Date.UTC(year, month - 1, day, hour, minute);
  let guess = targetUtc;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const represented = localParts(new Date(guess), timeZone);
    const [representedYear, representedMonth, representedDay] = represented.date.split("-").map(Number);
    const [representedHour, representedMinute] = represented.time.split(":").map(Number);
    const representedUtc = Date.UTC(
      representedYear,
      representedMonth - 1,
      representedDay,
      representedHour,
      representedMinute,
    );
    const difference = targetUtc - representedUtc;
    if (difference === 0) break;
    guess += difference;
  }

  const result = new Date(guess);
  if (localParts(result, timeZone).date !== localDate || localParts(result, timeZone).time !== localTime) {
    throw new RangeError(`The local time ${localDate} ${localTime} does not exist in ${timeZone}.`);
  }
  return result;
}

function nextLocalDate(date: string): string {
  return new Date(Date.parse(`${date}T00:00:00.000Z`) + 86_400_000).toISOString().slice(0, 10);
}

export function generateDoseOccurrences(
  medicationId: string,
  medication: Medication,
  fromDate: string,
  throughDate: string,
  timeZone: string,
): DoseOccurrence[] {
  if (throughDate < fromDate) throw new RangeError("The end date must be on or after the start date.");
  if (medication.paused) return [];
  const output: DoseOccurrence[] = [];

  for (let date = fromDate; date <= throughDate; date = nextLocalDate(date)) {
    if (date < medication.startDate || (medication.endDate && date > medication.endDate)) continue;
    const dayOfWeek = new Date(`${date}T00:00:00.000Z`).getUTCDay();
    if (!medication.daysOfWeek.includes(dayOfWeek)) continue;
    for (const localTime of medication.times) {
      const scheduledAt = localTimeToUtc(date, localTime, timeZone);
      output.push({
        id: `${date}_${localTime.replace(":", "-")}_${medicationId}`,
        medicationId,
        localDate: date,
        localTime,
        scheduledAt: scheduledAt.toISOString(),
      });
    }
  }

  return output.sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt));
}
