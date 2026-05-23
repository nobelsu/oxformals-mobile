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

/** Same fields as create; used when saving listing edits. */
export type UpdateListingInput = NewListingInput;

export const dataClient = {
  _reset(): void {
    // Test helper placeholder
  },
};
