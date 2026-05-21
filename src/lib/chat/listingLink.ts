import type { Id } from "@/convex/_generated/dataModel";
import type { ListingSummary } from "@/src/lib/chat/types";

/** Matches /requests/{listingId} with optional origin. */
const LISTING_URL_RE =
  /(?:https?:\/\/[^\s/]+)?\/requests\/([a-zA-Z0-9]+)/gi;

export function findListingIdsInText(text: string): string[] {
  const ids: string[] = [];
  const re = new RegExp(LISTING_URL_RE.source, "gi");
  for (const match of text.matchAll(re)) {
    const id = match[1];
    if (id) ids.push(id);
  }
  return ids;
}

/** Remove formal listing URLs from text and collapse extra whitespace. */
export function stripListingLinksFromText(text: string): string {
  return text
    .replace(LISTING_URL_RE, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectListingLinkSuggestion(
  text: string,
  referableById: Map<string, ListingSummary>,
): ListingSummary | null {
  const ids = findListingIdsInText(text);
  if (ids.length === 0) return null;

  for (let i = ids.length - 1; i >= 0; i--) {
    const listing = referableById.get(ids[i]!);
    if (listing) return listing;
  }
  return null;
}

export type PasteListingLinkResult = {
  listing: ListingSummary;
  /** Text to keep in the composer after removing the link(s). */
  remainingText: string;
};

/** If pasted content contains a referable listing link, return it and cleaned text. */
export function parsePastedListingLink(
  pasted: string,
  referableById: Map<string, ListingSummary>,
): PasteListingLinkResult | null {
  const ids = findListingIdsInText(pasted);
  if (ids.length === 0) return null;

  for (let i = ids.length - 1; i >= 0; i--) {
    const listing = referableById.get(ids[i]!);
    if (!listing) continue;
    return {
      listing,
      remainingText: stripListingLinksFromText(pasted),
    };
  }
  return null;
}

export function listingIdFromPath(pathname: string): Id<"listings"> | null {
  const match = pathname.match(/^\/requests\/([a-zA-Z0-9]+)$/);
  return match?.[1] ? (match[1] as Id<"listings">) : null;
}

export function listingRequestsPath(listingId: Id<"listings">): string {
  return `/requests/${listingId}`;
}
