import type { SwapRequest } from "./types";

export const OFFERING_NO_SWAP_CAPACITY_MESSAGE =
  "Your listing has no seats left to offer in new swaps.";

/** Resolve request type; pay requests have no offering listing. */
export function resolveRequestType(request: SwapRequest): SwapRequest["requestType"] {
  if (request.requestType) return request.requestType;
  return request.offeringListingId ? "swap" : "pay";
}

function isActiveOutgoing(request: SwapRequest, userId: string): boolean {
  return (
    request.fromUserId === userId &&
    (request.status === "pending" || request.status === "accepted")
  );
}

/** Requests from others to join this listing (swap or pay). */
export function incomingRequestsForListing(
  requests: SwapRequest[],
  userId: string,
  listingId: string,
): SwapRequest[] {
  return requests.filter(
    (r) => r.toUserId === userId && r.targetListingId === listingId,
  );
}

/** Pending incoming requests on a listing owned by the user. */
export function pendingIncomingRequestsForListing(
  requests: SwapRequest[],
  userId: string,
  listingId: string,
): SwapRequest[] {
  return incomingRequestsForListing(requests, userId, listingId).filter(
    (r) => r.status === "pending",
  );
}

/**
 * Outgoing swap requests offered via this listing.
 * Pay requests have no offering listing; see outgoingPayRequests on the Listings tab.
 */
export function sentRequestsForListing(
  requests: SwapRequest[],
  userId: string,
  listingId: string,
): SwapRequest[] {
  return requests.filter(
    (r) => r.fromUserId === userId && r.offeringListingId === listingId,
  );
}

/** All pay requests sent by the user (no offering listing). */
export function outgoingPayRequests(
  requests: SwapRequest[],
  userId: string,
): SwapRequest[] {
  return requests.filter(
    (r) => r.fromUserId === userId && resolveRequestType(r) === "pay",
  );
}

/** All requests received by the user (pay or swap, any listing). */
export function incomingRequestsForUser(
  requests: SwapRequest[],
  userId: string,
): SwapRequest[] {
  return requests.filter((r) => r.toUserId === userId);
}

/** All requests sent by the user (pay or swap). */
export function outgoingRequestsForUser(
  requests: SwapRequest[],
  userId: string,
): SwapRequest[] {
  return requests.filter((r) => r.fromUserId === userId);
}

/** True when the user has a pending or accepted outgoing request to this target listing. */
export function hasBlockingOutgoingRequestForTarget(
  requests: SwapRequest[],
  userId: string,
  targetListingId: string,
): boolean {
  return findBlockingOutgoingRequestForTarget(requests, userId, targetListingId) !==
    undefined;
}

/** First blocking outgoing request to this target listing, if any. */
export function findBlockingOutgoingRequestForTarget(
  requests: SwapRequest[],
  userId: string,
  targetListingId: string,
): SwapRequest | undefined {
  return requests.find(
    (r) =>
      isActiveOutgoing(r, userId) && r.targetListingId === targetListingId,
  );
}

/** Active outgoing swap requests that reserve capacity on an offering listing. */
export function outgoingSwapsUsingOffering(
  requests: SwapRequest[],
  userId: string,
  offeringListingId: string,
): SwapRequest[] {
  return requests.filter(
    (r) =>
      isActiveOutgoing(r, userId) &&
      r.offeringListingId === offeringListingId &&
      resolveRequestType(r) === "swap",
  );
}

/** Whether the offering listing can support another outgoing swap request. */
export function offeringHasSwapCapacity(
  seatsAvailable: number,
  reservedCount: number,
): boolean {
  return seatsAvailable > 0 && reservedCount < seatsAvailable;
}

/** Whether the user can send a new swap using this offering listing. */
export function canSendSwapWithOffering(
  requests: SwapRequest[],
  userId: string,
  offeringListingId: string,
  seatsAvailable: number,
): boolean {
  const reserved = outgoingSwapsUsingOffering(
    requests,
    userId,
    offeringListingId,
  ).length;
  return offeringHasSwapCapacity(seatsAvailable, reserved);
}
