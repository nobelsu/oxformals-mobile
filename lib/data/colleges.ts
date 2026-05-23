/** All 39 Oxford colleges plus 4 permanent private halls (43 total). */
export const OXFORD_COLLEGES = [
  "All Souls",
  "Balliol",
  "Blackfriars",
  "Brasenose",
  "Campion Hall",
  "Christ Church",
  "Corpus Christi",
  "Exeter",
  "Green Templeton",
  "Harris Manchester",
  "Hertford",
  "Jesus",
  "Keble",
  "Kellogg",
  "Lady Margaret Hall",
  "Linacre",
  "Lincoln",
  "Magdalen",
  "Mansfield",
  "Merton",
  "New College",
  "Nuffield",
  "Oriel",
  "Pembroke",
  "Queen's",
  "Regent's Park",
  "Reuben",
  "Somerville",
  "St Anne's",
  "St Antony's",
  "St Catherine's",
  "St Cross",
  "St Edmund Hall",
  "St Hilda's",
  "St Hugh's",
  "St John's",
  "St Peter's",
  "Trinity",
  "University",
  "Wadham",
  "Wolfson",
  "Worcester",
  "Wycliffe Hall",
] as const;

export type College = (typeof OXFORD_COLLEGES)[number];

export const COLLEGE_FILTER_HIGHLIGHTS: College[] = [
  "Merton",
  "Christ Church",
  "Magdalen",
  "Trinity",
  "Wadham",
  "Keble",
  "Exeter",
];

const COLLEGE_LIST = OXFORD_COLLEGES as readonly string[];

/** Match against the known college list; preserve unknown but trimmed names. */
export function normalizeCollegeName(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  const exact = COLLEGE_LIST.find((c) => c === t);
  if (exact) return exact;
  const ci = COLLEGE_LIST.find((c) => c.toLowerCase() === t.toLowerCase());
  return ci ?? t;
}
