import type { Doc } from "./_generated/dataModel";

export function formatListingDate(iso: string): string {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const suffix = hours >= 12 ? "pm" : "am";
  hours = hours % 12 || 12;
  const time =
    minutes === "00" ? `${hours}${suffix}` : `${hours}:${minutes}${suffix}`;
  return `${day} · ${time}`;
}

function formatPrice(gbp: number): string {
  return `£${gbp}`;
}

function resolveListingType(
  listing: Pick<Doc<"listings">, "listingType">,
): "swap" | "pay" | "both" {
  return listing.listingType ?? "swap";
}

export function formatListingTypeLabel(listing: Doc<"listings">): string {
  const listingType = resolveListingType(listing);
  if (listingType === "pay") {
    return listing.price !== undefined
      ? `Pay · ${formatPrice(listing.price)}`
      : "Pay";
  }
  if (listingType === "both") {
    const pricePart =
      listing.price !== undefined ? ` · ${formatPrice(listing.price)}` : "";
    return `Swap or pay${pricePart}`;
  }
  return "Swap";
}
