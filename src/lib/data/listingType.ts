import type { Listing, ListingType, RequestType } from "./types";

export function listingSupportsSwap(listingType: ListingType): boolean {
  return listingType === "swap" || listingType === "both";
}

export function listingRequestCta(listingType: ListingType): string {
  if (listingType === "pay") return "Request to join!";
  if (listingType === "both") return "Send request!";
  return "Request swap!";
}

export function listingAllowsRequest(
  listing: Listing,
  requestType: RequestType,
): boolean {
  if (listing.listingType === "both") return true;
  return listing.listingType === requestType;
}
