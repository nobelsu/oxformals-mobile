import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

const ALLOWED_MENU_FILE_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export type ListingWithMenuPdfUrl = Doc<"listings"> & {
  menuPdfUrl: string | null;
  menuFileContentType: string | null;
};

export async function validateMenuPdfId(
  ctx: MutationCtx,
  menuPdfId: Id<"_storage">,
): Promise<void> {
  const metadata = await ctx.db.system.get("_storage", menuPdfId);
  if (!metadata) {
    throw new Error("Menu file not found. Try uploading again.");
  }
  if (
    !metadata.contentType ||
    !ALLOWED_MENU_FILE_TYPES.has(metadata.contentType)
  ) {
    throw new Error("Menu file must be a PDF or image (JPEG, PNG, WebP, or GIF).");
  }
}

export async function deleteMenuPdfIfPresent(
  ctx: MutationCtx,
  menuPdfId: Id<"_storage"> | undefined,
): Promise<void> {
  if (menuPdfId) {
    await ctx.storage.delete(menuPdfId);
  }
}

export function listingIsPast(dateTime: string, nowMs: number): boolean {
  const t = Date.parse(dateTime);
  if (Number.isNaN(t)) return false;
  return t <= nowMs;
}

export function resolveStatusAfterEdit(
  listing: Pick<Doc<"listings">, "status" | "members" | "groupSize">,
  finalDateTime: string,
  finalGroupSize: number,
  nowMs: number,
): Doc<"listings">["status"] | undefined {
  const past = listingIsPast(finalDateTime, nowMs);
  const newSeats = finalGroupSize - listing.members.length;

  if (past) {
    if (listing.status === "active") {
      return "expired";
    }
    return undefined;
  }

  if (newSeats > 0) {
    if (
      listing.status === "confirmed" ||
      listing.status === "closed" ||
      listing.status === "expired"
    ) {
      return "active";
    }
    return undefined;
  }

  if (listing.status === "active") {
    return "confirmed";
  }

  return undefined;
}

export async function declinePendingRequestsForListing(
  ctx: MutationCtx,
  listingId: Id<"listings">,
): Promise<void> {
  const pendingAsTarget = await ctx.db
    .query("requests")
    .withIndex("by_targetListingId_and_status", (q) =>
      q.eq("targetListingId", listingId).eq("status", "pending"),
    )
    .take(200);
  for (const req of pendingAsTarget) {
    await ctx.db.patch(req._id, { status: "declined" });
  }

  const pendingAsOffering = await ctx.db
    .query("requests")
    .withIndex("by_offeringListingId_and_status", (q) =>
      q.eq("offeringListingId", listingId).eq("status", "pending"),
    )
    .take(200);
  for (const req of pendingAsOffering) {
    await ctx.db.patch(req._id, { status: "declined" });
  }
}

export async function expireListing(
  ctx: MutationCtx,
  listingId: Id<"listings">,
): Promise<void> {
  const listing = await ctx.db.get(listingId);
  if (!listing || listing.status !== "active") return;

  await declinePendingRequestsForListing(ctx, listingId);
  await ctx.db.patch(listingId, { status: "expired" });
}

export function resolveRequestType(
  req: Pick<Doc<"requests">, "requestType" | "offeringListingId">,
): "swap" | "pay" {
  return req.requestType ?? (req.offeringListingId !== undefined ? "swap" : "pay");
}

export const OFFERING_NO_SWAP_CAPACITY_MESSAGE =
  "Your listing has no seats left to offer in new swaps.";

/** Pending + accepted swaps that reserve seats on an offering listing. */
export function countReservedSwapsForOffering(
  mine: Doc<"requests">[],
  offeringListingId: Id<"listings">,
): number {
  return mine.filter(
    (item) =>
      item.offeringListingId === offeringListingId &&
      resolveRequestType(item) === "swap" &&
      (item.status === "pending" || item.status === "accepted"),
  ).length;
}

export async function enrichListing(
  ctx: QueryCtx,
  listing: Doc<"listings">,
): Promise<ListingWithMenuPdfUrl> {
  if (!listing.menuPdfId) {
    return { ...listing, menuPdfUrl: null, menuFileContentType: null };
  }
  const metadata = await ctx.db.system.get("_storage", listing.menuPdfId);
  const menuPdfUrl = (await ctx.storage.getUrl(listing.menuPdfId)) ?? null;
  return {
    ...listing,
    menuPdfUrl,
    menuFileContentType: metadata?.contentType ?? null,
  };
}
