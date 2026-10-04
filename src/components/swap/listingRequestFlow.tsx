import { useAuth } from "@/src/components/auth/useAuth";
import { useData } from "@/src/components/data/useData";
import { JoinRequestSheet } from "@/src/components/swap/JoinRequestSheet";
import { findBlockingOutgoingRequestForTarget } from "@/src/lib/data/requestFilters";
import { listingSupportsSwap } from "@/src/lib/data/listingType";
import type { Listing } from "@/src/lib/data/types";
import { WEB_ORIGIN } from "@/src/lib/webOrigin";
import { useMemo, useState } from "react";
import { Alert, Share } from "react-native";

type Options = {
  onSignInRequired: () => void;
  /** Opens the list-formal sheet when the user has no offering listing. */
  onListFormalRequired?: () => void;
  /** Fallback when list-formal sheet is unavailable (e.g. listing detail screen). */
  onNavigateToRequests?: () => void;
};

function alertBlockingRequest(
  status: "pending" | "accepted" | "declined",
): void {
  if (status === "accepted") {
    Alert.alert(
      "Request already accepted",
      "You already have an accepted request for this listing.",
    );
    return;
  }
  Alert.alert(
    "Request already sent",
    "You already have a request waiting on this listing. Withdraw it under Your formals before sending another.",
  );
}

/** Hand the "claim your seat" links to the system share sheet, one at a time. */
async function shareSeatLinks(tokens: string[]) {
  for (const token of tokens) {
    try {
      await Share.share({
        message: `A seat for you on Oxformals\n${WEB_ORIGIN}/s/${token}`,
      });
    } catch {
      // Dismissing the share sheet is fine; the link stays on the request.
    }
  }
}

/** The request button's behaviour for any listing: one sheet for every way to pay. */
export function useListingRequest({
  onSignInRequired,
  onListFormalRequired,
  onNavigateToRequests,
}: Options) {
  const { user, isAuthenticated } = useAuth();
  const { listings, requests } = useData();
  const [target, setTarget] = useState<Listing | null>(null);

  const myActiveListings = useMemo(
    () =>
      user
        ? listings.filter(
            (l) =>
              l.ownerUserId === user.id &&
              l.status === "active" &&
              listingSupportsSwap(l.listingType) &&
              l.id !== target?.id,
          )
        : [],
    [listings, user, target?.id],
  );

  function onCardRequest(listing: Listing) {
    if (!isAuthenticated || !user) {
      onSignInRequired();
      return;
    }
    const blocking = findBlockingOutgoingRequestForTarget(requests, user.id, listing.id);
    if (blocking) {
      alertBlockingRequest(blocking.status);
      return;
    }
    setTarget(listing);
  }

  const modals = target ? (
    <JoinRequestSheet
      key={target.id}
      target={target}
      myListings={myActiveListings}
      onClose={() => setTarget(null)}
      onListFormal={() => {
        setTarget(null);
        if (onListFormalRequired) onListFormalRequired();
        else onNavigateToRequests?.();
      }}
      onSent={({ accepted, links }) => {
        const college = target.college;
        setTarget(null);
        if (links.length > 0) {
          Alert.alert(
            "Request sent",
            links.length === 1
              ? "Send your guest their link so they can claim the seat. The host can accept once they've joined."
              : `Send each of your ${links.length} guests their link so they can claim a seat. The host can accept once they've joined.`,
            [{ text: "Share links", onPress: () => void shareSeatLinks(links) }],
          );
        } else if (accepted) {
          Alert.alert("You're in!", `Your seat at ${college} is confirmed.`);
        }
      }}
    />
  ) : null;

  return { onCardRequest, modals };
}
