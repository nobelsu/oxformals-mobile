/**
 * Formals happen in Oxford, so their times are Oxford times wherever the
 * phone is. The date pickers work with device-local Dates; these helpers
 * treat such a Date's wall-clock fields as Oxford's and convert at the edges.
 */
export const OXFORD_TIME_ZONE = "Europe/London";

/** Oxford wall-clock parts of an instant. */
export function oxfordParts(ms: number) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: OXFORD_TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(ms));
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { y: get("year"), mo: get("month"), d: get("day"), h: get("hour"), mi: get("minute") };
}

/** `YYYY-MM-DD` of the Oxford day an instant falls on. */
export function isoToOxfordDateKey(iso: string): string {
  const { y, mo, d } = oxfordParts(Date.parse(iso));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${y}-${p(mo)}-${p(d)}`;
}

/** A picker Date (wall clock read as Oxford time) as the ISO instant it means. */
export function pickerDateToIso(date: Date): string {
  const wall = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
  );
  // Guess, then correct by the Oxford offset at that instant (twice, so a
  // guess that lands across a clock change settles).
  let ms = wall;
  for (let i = 0; i < 2; i++) {
    const o = oxfordParts(ms);
    ms += wall - Date.UTC(o.y, o.mo - 1, o.d, o.h, o.mi);
  }
  return new Date(ms).toISOString();
}

/** An ISO instant as a picker Date whose wall clock shows the Oxford time. */
export function isoToPickerDate(iso: string): Date | null {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  const { y, mo, d, h, mi } = oxfordParts(ms);
  return new Date(y, mo - 1, d, h, mi, 0, 0);
}
