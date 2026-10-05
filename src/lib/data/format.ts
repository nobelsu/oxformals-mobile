import {
  isoToOxfordDateKey,
  OXFORD_TIME_ZONE,
  oxfordParts,
} from "@/src/lib/time/oxfordTime";
import type { ListingStatus } from "@/src/lib/data/types";

export function formatListingSeatsLabel(seatsAvailable: number): string {
  if (seatsAvailable === 0) return "Group full";
  return `${seatsAvailable} ${seatsAvailable === 1 ? "seat" : "seats"} left`;
}

export function formatListingStatusLabel(
  status: ListingStatus,
  seatsAvailable?: number,
): string {
  switch (status) {
    case "active":
      return "Active";
    case "confirmed":
      return "Listing full";
    case "closed":
      return seatsAvailable === 0 ? "Group full" : "Closed";
    case "expired":
      return "Past";
  }
}

// "Thu 8 May · 7:15pm", in Oxford time.
export function formatListingDate(iso: string): string {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("en-GB", {
    timeZone: OXFORD_TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
  return `${day} · ${formatListingTime(iso)}`;
}

// "7:15pm" or "7pm", in Oxford time.
export function formatListingTime(iso: string): string {
  const { h, mi } = oxfordParts(Date.parse(iso));
  const suffix = h >= 12 ? "pm" : "am";
  const hours = h % 12 || 12;
  const minutes = String(mi).padStart(2, "0");
  return minutes === "00" ? `${hours}${suffix}` : `${hours}:${minutes}${suffix}`;
}

export function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: OXFORD_TIME_ZONE,
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

/** `YYYY-MM-DD` of a formal's Oxford day (compared with calendar picks). */
export function isoToLocalDateKey(iso: string): string {
  return isoToOxfordDateKey(iso);
}

/** `YYYY-MM-DD` in the user's local timezone from a millisecond timestamp. */
export function timestampToLocalDateKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfLocalDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Day header for chat threads: Today, Yesterday, weekday, or calendar date. */
export function formatChatDayLabel(ts: number, now: number = Date.now()): string {
  const dayStart = startOfLocalDay(ts);
  const todayStart = startOfLocalDay(now);
  const diffDays = Math.round((todayStart - dayStart) / 86_400_000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays >= 2 && diffDays <= 7) {
    return new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(new Date(ts));
  }

  const d = new Date(ts);
  const nowDate = new Date(now);
  if (d.getFullYear() === nowDate.getFullYear()) {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
    }).format(d);
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  const d = new Date(ts);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(d);
}

function ordinalSuffix(value: number): string {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";
  switch (value % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

export function formatPrice(gbp: number): string {
  return `£${gbp}`;
}

export function formatYearLabel(raw: string | number | null | undefined): string {
  if (raw == null) return "";
  const value = String(raw).trim();
  if (!value) return "";

  const numericLike = value.match(/^(\d+)(?:st|nd|rd|th)?(?:\s*year)?$/i);
  if (!numericLike) return value;

  const year = Number(numericLike[1]);
  if (!Number.isFinite(year) || year <= 0) return value;
  return `${year}${ordinalSuffix(year)} year`;
}
