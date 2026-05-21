import { formatListingDate } from "@/src/lib/data/format";
import type { Listing, RequestType } from "@/src/lib/data/types";

export type RequestRowDirection = "incoming" | "outgoing";

export type RequestFormalRole =
  | "your_listing"
  | "their_listing"
  | "your_offering"
  | "their_offering";

export type RequestFormalSlot = {
  role: RequestFormalRole;
  listing: Listing;
};

export function formatFormalLabel(listing: Listing): string {
  return `${listing.college} · ${formatListingDate(listing.dateTime)}`;
}

export function requestFormalRoleLabel(role: RequestFormalRole): string {
  switch (role) {
    case "your_listing":
      return "Your listing";
    case "their_listing":
      return "Their listing";
    case "your_offering":
      return "Your offering";
    case "their_offering":
      return "Their offering";
  }
}

export function getRequestRowFormals(args: {
  requestType: RequestType;
  direction: RequestRowDirection;
  targetListing?: Listing;
  offeringListing?: Listing;
}): RequestFormalSlot[] {
  const { requestType, direction, targetListing, offeringListing } = args;

  if (requestType === "pay") {
    if (!targetListing) return [];
    return [
      {
        role: direction === "incoming" ? "your_listing" : "their_listing",
        listing: targetListing,
      },
    ];
  }

  if (offeringListing && targetListing) {
    return direction === "outgoing"
      ? [
          { role: "your_offering", listing: offeringListing },
          { role: "their_listing", listing: targetListing },
        ]
      : [
          { role: "your_listing", listing: targetListing },
          { role: "their_offering", listing: offeringListing },
        ];
  }

  if (offeringListing) {
    return [
      {
        role: direction === "outgoing" ? "your_offering" : "their_offering",
        listing: offeringListing,
      },
    ];
  }

  if (targetListing) {
    return [
      {
        role: direction === "incoming" ? "your_listing" : "their_listing",
        listing: targetListing,
      },
    ];
  }

  return [];
}

export function formatRequestRowAccessibilityLabel(
  slots: RequestFormalSlot[],
): string | null {
  if (slots.length === 0) return null;

  const parts = slots.map(
    (slot) =>
      `${requestFormalRoleLabel(slot.role)}, ${formatFormalLabel(slot.listing)}`,
  );

  return parts.join(slots.length > 1 ? ". " : "");
}

/** @deprecated Use getRequestRowFormals + RequestRowFormals component */
export function formatRequestRowSubtitle(args: {
  requestType: RequestType;
  direction: RequestRowDirection;
  targetListing?: Listing;
  offeringListing?: Listing;
}): string | null {
  const slots = getRequestRowFormals(args);
  return formatRequestRowAccessibilityLabel(slots);
}
