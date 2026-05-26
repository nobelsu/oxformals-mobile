export type FormalTimeSlot = { hours: number; minutes: number };

export const FORMAL_TIME_SLOTS: FormalTimeSlot[] = [];
for (let h = 12; h < 24; h++) {
  FORMAL_TIME_SLOTS.push({ hours: h, minutes: 0 }, { hours: h, minutes: 30 });
}

export function formatFormalTimeSlot(hours: number, minutes: number): string {
  const d = new Date(2000, 0, 1, hours, minutes);
  return new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: minutes === 0 ? undefined : "2-digit",
  }).format(d);
}

export function formatFormalTimeForInput(date: Date): string {
  return formatFormalTimeSlot(date.getHours(), date.getMinutes());
}

export function applyTimeToDate(
  base: Date,
  hours: number,
  minutes: number,
): Date {
  const next = new Date(base);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

/**
 * Parses informal UK-style time strings for formal listings.
 * Hours 1–11 without am/pm are treated as pm (evening formals).
 */
export function parseFormalTimeInput(
  text: string,
): { hours: number; minutes: number } | null {
  const trimmed = text.trim().toLowerCase();
  if (!trimmed) return null;

  const match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = match[2] !== undefined ? parseInt(match[2], 10) : 0;
  const suffix = match[3];

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  if (minutes < 0 || minutes > 59) return null;
  if (hours < 0 || hours > 23) return null;

  if (suffix === "am") {
    if (hours === 12) hours = 0;
    else if (hours > 12) return null;
  } else if (suffix === "pm") {
    if (hours !== 12 && hours < 12) hours += 12;
  } else if (hours >= 1 && hours <= 11) {
    hours += 12;
  } else if (hours === 0) {
    return null;
  }

  if (hours < 0 || hours > 23) return null;
  return { hours, minutes };
}

export type LabeledFormalTimeSlot = {
  slot: FormalTimeSlot;
  label: string;
};

export function labelFormalTimeSlots(
  slots: FormalTimeSlot[] = FORMAL_TIME_SLOTS,
): LabeledFormalTimeSlot[] {
  return slots.map((slot) => ({
    slot,
    label: formatFormalTimeSlot(slot.hours, slot.minutes),
  }));
}

export function filterFormalTimeSlots(
  query: string,
  slots: FormalTimeSlot[] = FORMAL_TIME_SLOTS,
): LabeledFormalTimeSlot[] {
  const labeled = labelFormalTimeSlots(slots);
  const q = query.trim().toLowerCase();
  if (!q) return labeled;
  return labeled.filter(({ label }) => label.toLowerCase().includes(q));
}
