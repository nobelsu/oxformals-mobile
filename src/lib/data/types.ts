export type GroupSize = 2 | 3 | 4 | 5 | 6;

export const GROUP_SIZES: GroupSize[] = [2, 3, 4, 5, 6];

export type ListingStatus = "active" | "confirmed" | "closed" | "expired";

export type ListingType = "swap" | "pay" | "both";

export type RequestType = "swap" | "pay";

export type Listing = {
  id: string;
  ownerUserId: string;
  college: string;
  dateTime: string; // ISO
  groupSize: GroupSize;
  seatsAvailable: number;
  members: string[];
  /** Snapshot from the poster's profile when the listing was created. */
  year: string;
  /** Snapshot from the poster's profile when the listing was created. */
  role: string;
  message: string;
  menu: string;
  menuPdfUrl?: string;
  menuFileContentType?: string;
  listingType: ListingType;
  price?: number;
  status: ListingStatus;
  createdAt: number;
};

export type SwapRequestStatus = "pending" | "accepted" | "declined";

export type SwapRequest = {
  id: string;
  fromUserId: string;
  toUserId: string;
  targetListingId: string;
  requestType: RequestType;
  offeringListingId?: string;
  message: string;
  status: SwapRequestStatus;
  createdAt: number;
};

export type Wishlists = Record<string, string[]>;
