/** Oxford wall-clock helpers (BST/GMT) without a date library. */

const PARTS = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  hourCycle: "h23",
});

function londonParts(ms: number) {
  const out: Record<string, number> = {};
  for (const p of PARTS.formatToParts(new Date(ms))) {
    if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  return { year: out.year, month: out.month, day: out.day, hour: out.hour, minute: out.minute };
}

/** London's offset from UTC at `ms`, in ms (0 in winter, +1h in summer). */
function londonOffsetMs(ms: number): number {
  const p = londonParts(ms);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return asUtc - Math.floor(ms / 60_000) * 60_000;
}

/** UTC ms of midnight in London on the given calendar day (day may overflow). */
function londonMidnight(year: number, month: number, day: number): number {
  const guess = Date.UTC(year, month - 1, day);
  return guess - londonOffsetMs(guess);
}

export function londonHour(ms: number): number {
  return londonParts(ms).hour;
}

/** The London calendar day `offsetDays` from the one containing `ms`, as [start, end). */
export function londonDayRange(ms: number, offsetDays: number): { start: number; end: number } {
  const p = londonParts(ms);
  return {
    start: londonMidnight(p.year, p.month, p.day + offsetDays),
    end: londonMidnight(p.year, p.month, p.day + offsetDays + 1),
  };
}
