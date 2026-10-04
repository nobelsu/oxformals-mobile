import { OXFORD_COLLEGES } from "./colleges";

export type BadgeFamily = "milestone" | "college" | "special";

/** Keys into the hand-drawn icon set in components/badges/BadgeArt.tsx. */
export type BadgeIconId =
  | "glass"
  | "cap"
  | "candle"
  | "crown"
  | "star"
  | "pen"
  | "trophy"
  | "college"
  | "canape";
export type BadgeMetric = "formals" | "reviews";

export type MilestoneBadgeDefinition = {
  id: string;
  family: "milestone";
  metric: BadgeMetric;
  threshold: number;
  name: string;
  icon: BadgeIconId;
  description: string;
};

export type CollegeBadgeDefinition = {
  id: string;
  family: "college";
  college: string;
  name: string;
  icon: BadgeIconId;
  description: string;
};

/** Handed out, not earned: only ever shown to people who hold it. */
export type SpecialBadgeDefinition = {
  id: string;
  family: "special";
  name: string;
  icon: BadgeIconId;
  description: string;
};

export type BadgeDefinition =
  | MilestoneBadgeDefinition
  | CollegeBadgeDefinition
  | SpecialBadgeDefinition;

const COLLEGE_BADGE_ICON: BadgeIconId = "college";

function collegeSlug(college: string): string {
  return college.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export const MILESTONE_BADGES: MilestoneBadgeDefinition[] = [
  {
    id: "formals-1",
    family: "milestone",
    metric: "formals",
    threshold: 1,
    name: "First Formal",
    icon: "glass",
    description: "Attended your first formal.",
  },
  {
    id: "formals-5",
    family: "milestone",
    metric: "formals",
    threshold: 5,
    name: "Regular",
    icon: "cap",
    description: "Attended 5 formals.",
  },
  {
    id: "formals-10",
    family: "milestone",
    metric: "formals",
    threshold: 10,
    name: "Formal Fixture",
    icon: "candle",
    description: "Attended 10 formals.",
  },
  {
    id: "formals-25",
    family: "milestone",
    metric: "formals",
    threshold: 25,
    name: "Formal Royalty",
    icon: "crown",
    description: "Attended 25 formals.",
  },
  {
    id: "reviews-1",
    family: "milestone",
    metric: "reviews",
    threshold: 1,
    name: "First Review",
    icon: "star",
    description: "Posted your first public review.",
  },
  {
    id: "reviews-5",
    family: "milestone",
    metric: "reviews",
    threshold: 5,
    name: "Critic",
    icon: "pen",
    description: "Posted 5 public reviews.",
  },
  {
    id: "reviews-10",
    family: "milestone",
    metric: "reviews",
    threshold: 10,
    name: "Connoisseur",
    icon: "trophy",
    description: "Posted 10 public reviews.",
  },
];

export const COLLEGE_BADGES: CollegeBadgeDefinition[] = OXFORD_COLLEGES.map(
  (college) => ({
    id: `college-${collegeSlug(college)}`,
    family: "college",
    college,
    name: college,
    icon: COLLEGE_BADGE_ICON,
    description: `Attended a formal at ${college}.`,
  }),
);

/** For everyone who signed up in Oxformals' first term. */
export const FOUNDING_BADGE_ID = "founding-guest";

export const SPECIAL_BADGES: SpecialBadgeDefinition[] = [
  {
    id: FOUNDING_BADGE_ID,
    family: "special",
    name: "Starter",
    icon: "canape",
    description: "Here for the first course: joined Oxformals in its first term.",
  },
];

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  ...SPECIAL_BADGES,
  ...MILESTONE_BADGES,
  ...COLLEGE_BADGES,
];

/** Badges anyone can still earn. */
export const TOTAL_BADGE_COUNT = MILESTONE_BADGES.length + COLLEGE_BADGES.length;

/**
 * "x of y" for someone's badges. Special badges can't be earned any more, so
 * they only join the total for the people who hold them: a holder with nothing
 * else reads "1 of 51", everyone else "0 of 50".
 */
export function badgeTally(rows: { badgeId: string }[]): { earned: number; total: number } {
  const specialsHeld = rows.filter((r) => SPECIAL_BADGES.some((b) => b.id === r.badgeId)).length;
  return { earned: rows.length, total: TOTAL_BADGE_COUNT + specialsHeld };
}

export type MedalTone = "bronze" | "silver" | "gold" | "ruby" | "ink";

const LADDER_TONES: MedalTone[] = ["bronze", "silver", "gold", "ruby"];

/** A medal's metal: its step on its own ladder (1st bronze … 4th ruby); specials are ink. */
export function medalTone(def: BadgeDefinition): MedalTone {
  if (def.family !== "milestone") return "ink";
  const ladder = MILESTONE_BADGES.filter((b) => b.metric === def.metric);
  return LADDER_TONES[Math.min(ladder.findIndex((b) => b.id === def.id), 3)] ?? "bronze";
}

export function badgeById(id: string): BadgeDefinition | undefined {
  return BADGE_DEFINITIONS.find((b) => b.id === id);
}

/** Short labels Oxford students actually use; the rest use three letters. */
const STAMP_LABELS: Record<string, string> = {
  "All Souls": "ASC",
  Brasenose: "BNC",
  "Campion Hall": "CAM",
  "Christ Church": "CHCH",
  "Corpus Christi": "CCC",
  "Green Templeton": "GTC",
  "Harris Manchester": "HMC",
  "Lady Margaret Hall": "LMH",
  Linacre: "LINA",
  Lincoln: "LINC",
  "New College": "NEW",
  "Queen's": "QUE",
  "Regent's Park": "RPC",
  "St Anne's": "SAN",
  "St Antony's": "SAT",
  "St Catherine's": "CATZ",
  "St Cross": "SCR",
  "St Edmund Hall": "SEH",
  "St Hilda's": "SHI",
  "St Hugh's": "SHU",
  "St John's": "SJC",
  "St Peter's": "SPC",
  University: "UNIV",
  "Wycliffe Hall": "WYC",
};

/** Label printed inside a college's passport stamp. */
export function stampLabel(college: string): string {
  return STAMP_LABELS[college] ?? college.slice(0, 3).toUpperCase();
}
