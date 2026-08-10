const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function toDateOnly(value: Date | string): string {
  if (typeof value === "string" && DATE_ONLY_PATTERN.test(value)) return value;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date");
  return date.toISOString().slice(0, 10);
}

/** Add calendar months while keeping end-of-month dates valid (Jan 31 + 1 = Feb 28/29). */
export function addCalendarMonths(value: Date | string, months: number): string {
  if (!Number.isInteger(months) || months < 1 || months > 120) {
    throw new Error("Months must be between 1 and 120");
  }

  const dateOnly = toDateOnly(value);
  const [year, month, day] = dateOnly.split("-").map(Number);
  const targetFirst = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(targetFirst.getUTCFullYear(), targetFirst.getUTCMonth() + 1, 0)
  ).getUTCDate();
  targetFirst.setUTCDate(Math.min(day, lastDay));
  return targetFirst.toISOString().slice(0, 10);
}

export function activePeriod(
  today: Date | string,
  months = 1,
  existingEnd?: string | null
) {
  const start = toDateOnly(today);
  const base = existingEnd && existingEnd > start ? existingEnd : start;
  return {
    current_period_start: start,
    current_period_end: addCalendarMonths(base, months),
  };
}

/** Treat an admin-selected trial date as the end of that day in Thailand (UTC+7). */
export function thailandEndOfDay(value: string): string {
  const dateOnly = toDateOnly(value);
  return new Date(`${dateOnly}T23:59:59.999+07:00`).toISOString();
}

export function thailandDateOnly(now = new Date()): string {
  return new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function isActivePeriodExpired(periodEnd: string | null | undefined, now = new Date()): boolean {
  return Boolean(periodEnd && periodEnd < thailandDateOnly(now));
}
