import type { Listing } from "./types";

/** Fields collected in the list-a-formal form (profile supplies the rest). */
export type NewListingInput = Pick<
  Listing,
  "dateTime" | "groupSize" | "message" | "menu" | "listingType"
> & {
  price?: number;
  menuPdfId?: string;
  clearMenuPdf?: boolean;
};

export const dataClient = {
  _reset(): void {
    // Test helper placeholder
  },
};
