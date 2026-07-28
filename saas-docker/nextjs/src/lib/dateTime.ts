export const BUSINESS_TIME_ZONE = "America/Sao_Paulo";

export interface ZonedDateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export function getZonedDateTimeParts(
  date: Date,
  timeZone: string = BUSINESS_TIME_ZONE,
): ZonedDateTimeParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

export function zonedDateTimeToUtc(
  parts: Omit<ZonedDateTimeParts, "second"> & { second?: number },
  timeZone: string = BUSINESS_TIME_ZONE,
) {
  if (
    ![parts.year, parts.month, parts.day, parts.hour, parts.minute, parts.second || 0].every(Number.isFinite)
    || parts.month < 1 || parts.month > 12
    || parts.day < 1 || parts.day > 31
    || parts.hour < 0 || parts.hour > 23
    || parts.minute < 0 || parts.minute > 59
  ) {
    return new Date(Number.NaN);
  }
  const targetAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second || 0,
  );
  let result = new Date(targetAsUtc);

  // Recalculate once to account for the zone offset at the target instant.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const actual = getZonedDateTimeParts(result, timeZone);
    const actualAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
    );
    result = new Date(result.getTime() + targetAsUtc - actualAsUtc);
  }
  return result;
}

export function getBusinessDayRange(date: Date) {
  const parts = getZonedDateTimeParts(date);
  return {
    start: zonedDateTimeToUtc({ ...parts, hour: 0, minute: 0, second: 0 }),
    end: zonedDateTimeToUtc({ ...parts, hour: 23, minute: 59, second: 59 }),
  };
}

export function formatBusinessTime(date: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: BUSINESS_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(typeof date === "string" ? new Date(date) : date);
}

export function formatBusinessDateKey(date: Date | string) {
  const parts = getZonedDateTimeParts(typeof date === "string" ? new Date(date) : date);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}
