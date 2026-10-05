import type { FormalType, Listing } from "./types";

/**
 * Browse filters: what the filter sheet picks and which listings pass. Ported
 * from the website's `lib/data/browseFilters.ts` (minus the URL round-trip).
 * Pure so the sheet's live "Show N" count and the list share one definition.
 */

export type WhenPreset = "tonight" | "week" | "weekend" | "dates";
/** Credit is accepted on every listing, so only swap and pay narrow the list. */
export type HowOption = "swap" | "pay";

export type BrowseFilters = {
  when: WhenPreset | null;
  /** `YYYY-MM-DD` days, used when `when` is "dates". */
  dates: string[];
  colleges: string[];
  /** Include the viewer's Want to go colleges. */
  wantToGo: boolean;
  how: HowOption[];
  /** People the viewer is bringing; a listing needs 1 + guests free seats. */
  guests: number;
  types: FormalType[];
};

export const EMPTY_BROWSE_FILTERS: BrowseFilters = {
  when: null,
  dates: [],
  colleges: [],
  wantToGo: false,
  how: [],
  guests: 0,
  types: [],
};

export const WHEN_PRESETS: WhenPreset[] = ["tonight", "week", "weekend", "dates"];
export const HOW_OPTIONS: HowOption[] = ["swap", "pay"];
/** Most people a filter can ask seats for; mirrors `MAX_GUESTS` on the backend. */
export const MAX_BROWSE_GUESTS = 4;
export const FORMAL_TYPES: FormalType[] = ["social", "matchmaking", "networking"];

/** Sections with something picked — the count on the filter button. */
export function activeFilterSections(filters: BrowseFilters): number {
  let n = 0;
  if (filters.when && (filters.when !== "dates" || filters.dates.length > 0)) n++;
  if (filters.colleges.length > 0 || filters.wantToGo) n++;
  if (filters.how.length > 0) n++;
  if (filters.guests > 0) n++;
  if (filters.types.length > 0) n++;
  return n;
}

function keyToUtcNoon(key: string): Date {
  return new Date(`${key}T12:00:00Z`);
}

function addDays(key: string, days: number): string {
  const d = keyToUtcNoon(key);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 0 = Monday … 6 = Sunday. */
function mondayIndex(key: string): number {
  return (keyToUtcNoon(key).getUTCDay() + 6) % 7;
}

/**
 * The Oxford days a "When" pick covers, given today's Oxford date key, or
 * null when it doesn't narrow anything. Weeks run Monday to Sunday.
 */
export function whenDateKeys(
  when: WhenPreset | null,
  dates: string[],
  todayKey: string,
): Set<string> | null {
  switch (when) {
    case null:
      return null;
    case "tonight":
      return new Set([todayKey]);
    case "week": {
      const out = new Set<string>();
      for (let i = 0; i <= 6 - mondayIndex(todayKey); i++) out.add(addDays(todayKey, i));
      return out;
    }
    case "weekend": {
      const idx = mondayIndex(todayKey);
      const saturday = addDays(todayKey, 5 - idx);
      if (idx === 6) return new Set([todayKey]);
      if (idx === 5) return new Set([todayKey, addDays(todayKey, 1)]);
      return new Set([saturday, addDays(saturday, 1)]);
    }
    case "dates":
      return dates.length > 0 ? new Set(dates) : null;
  }
}

export type FilterContext = {
  /** Oxford `YYYY-MM-DD` for today. */
  todayKey: string;
  /** Oxford `YYYY-MM-DD` of a listing (injected so this stays timezone-free). */
  dateKeyOf: (listing: Listing) => string;
  /** The viewer's Want to go colleges (empty when signed out). */
  wishlist: ReadonlySet<string>;
};

/** Builds a predicate for `filters`; listings pass when every section matches. */
export function browseFilterPredicate(
  filters: BrowseFilters,
  ctx: FilterContext,
): (listing: Listing) => boolean {
  const days = whenDateKeys(filters.when, filters.dates, ctx.todayKey);
  const colleges = new Set(filters.colleges);
  const useWishlist = filters.wantToGo && ctx.wishlist.size > 0;
  const whereActive = colleges.size > 0 || useWishlist;
  const how = new Set(filters.how);
  const types = new Set(filters.types);
  const seatsNeeded = 1 + filters.guests;

  return (l) => {
    if (days && !days.has(ctx.dateKeyOf(l))) return false;
    if (
      whereActive &&
      !colleges.has(l.college) &&
      !(useWishlist && ctx.wishlist.has(l.college))
    ) {
      return false;
    }
    if (how.size > 0) {
      const swaps = l.listingType === "swap" || l.listingType === "both";
      const pays = l.listingType === "pay" || l.listingType === "both";
      if (!((how.has("swap") && swaps) || (how.has("pay") && pays))) return false;
    }
    if (l.seatsAvailable < seatsNeeded) return false;
    if (types.size > 0 && !types.has(l.formalType)) return false;
    return true;
  };
}

/** "Just me", "Me + 1" … */
export function guestsLabel(guests: number): string {
  return guests === 0 ? "Just me" : `Me + ${guests}`;
}
