import type { Doc } from "@/convex/_generated/dataModel";

export function isProfileComplete(
  doc: Doc<"users"> | null | undefined,
): boolean {
  if (!doc) return false;
  return !!(
    doc.name?.trim() &&
    doc.college?.trim() &&
    doc.year?.trim() &&
    doc.role?.trim()
  );
}
