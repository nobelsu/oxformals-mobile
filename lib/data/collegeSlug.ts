import { OXFORD_COLLEGES } from "./colleges";

const COLLEGE_LIST = OXFORD_COLLEGES as readonly string[];

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const SLUG_TO_COLLEGE = new Map<string, string>(
  COLLEGE_LIST.map((college) => [slugify(college), college]),
);

/** URL-safe slug for a known Oxford college name. */
export function collegeToSlug(college: string): string {
  return slugify(college);
}

/** Resolve slug to canonical college name, or null if unknown. */
export function slugToCollege(slug: string): string | null {
  const normalized = slugify(slug.trim());
  if (!normalized) return null;
  return SLUG_TO_COLLEGE.get(normalized) ?? null;
}
