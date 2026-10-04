export type GroupSize = 2 | 3 | 4 | 5 | 6;

export const GROUP_SIZES: GroupSize[] = [2, 3, 4, 5, 6];

export type ListingStatus = "active" | "confirmed" | "closed" | "expired";

export type ListingType = "swap" | "pay" | "both";

/** The "vibe" of a formal, shown as a small tag on listings. */
export type FormalType = "matchmaking" | "social" | "networking";

export type RequestType = "swap" | "pay" | "credit";

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
  formalType: FormalType;
  price?: number;
  status: ListingStatus;
  createdAt: number;
  /** Unnamed "+N" guests, keyed by the member who brought them. */
  guestSeats?: { userId: string; count: number }[];
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
  /** Extra seats beyond the requester's own. */
  party?: PartySeat[];
};

export type PartySeat = {
  kind: "guest" | "friend" | "link";
  userId?: string;
  payerId: string;
  method: RequestType;
  response?: "pending" | "in" | "out";
  /** Link seats only. */
  token?: string;
  expiresAt?: number;
  paysOwn?: boolean;
};

export type Wishlists = Record<string, string[]>;
