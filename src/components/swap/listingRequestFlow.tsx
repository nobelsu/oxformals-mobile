import { useAuth } from "@/src/components/auth/useAuth";
import { useData } from "@/src/components/data/useData";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxModal } from "@/src/components/ui/OxModal";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { findBlockingOutgoingRequestForTarget } from "@/src/lib/data/requestFilters";
import { listingSupportsSwap } from "@/src/lib/data/listingType";
import type { Listing, RequestType } from "@/src/lib/data/types";
import { useMemo, useState } from "react";
import { Alert, Text } from "react-native";
import { RequestPayModal } from "./RequestPayModal";
import { RequestSwapModal } from "./RequestSwapModal";
import { RequestTypeChooserModal } from "./RequestTypeChooserModal";

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
    "You already have a request waiting on this listing. Withdraw it on the Listings tab before sending another.",
  );
}

export function useListingRequest({
  onSignInRequired,
  onListFormalRequired,
  onNavigateToRequests,
}: Options) {
  const { colors } = useOxTheme();
  const { user, isAuthenticated } = useAuth();
  const { listings, requests, sendRequest } = useData();

  const [requestTarget, setRequestTarget] = useState<Listing | null>(null);
  const [pendingRequestType, setPendingRequestType] = useState<RequestType | null>(
    null,
  );
  const [typeChooserTarget, setTypeChooserTarget] = useState<Listing | null>(null);
  const [showNoListingPrompt, setShowNoListingPrompt] = useState(false);

  const myActiveListings = useMemo(
    () =>
      user
        ? listings.filter(
            (l) =>
              l.ownerUserId === user.id &&
              l.status === "active" &&
              listingSupportsSwap(l.listingType),
          )
        : [],
    [listings, user],
  );

  function openRequestFlow(listing: Listing, requestType: RequestType) {
    if (!isAuthenticated) {
      onSignInRequired();
      return;
    }
    if (user) {
      const blocking = findBlockingOutgoingRequestForTarget(
        requests,
        user.id,
        listing.id,
      );
      if (blocking) {
        alertBlockingRequest(blocking.status);
        return;
      }
    }
    if (requestType === "swap" && myActiveListings.length === 0) {
      setShowNoListingPrompt(true);
      return;
    }
    setPendingRequestType(requestType);
    setRequestTarget(listing);
  }

  function onCardRequest(listing: Listing) {
    if (!isAuthenticated) {
      onSignInRequired();
      return;
    }
    if (listing.listingType === "both") {
      setTypeChooserTarget(listing);
      return;
    }
    openRequestFlow(listing, listing.listingType === "pay" ? "pay" : "swap");
  }

  const modals = (
    <>
      <RequestTypeChooserModal
        visible={!!typeChooserTarget}
        listing={typeChooserTarget}
        onClose={() => setTypeChooserTarget(null)}
        onChoose={(type) => {
          const l = typeChooserTarget;
          setTypeChooserTarget(null);
          if (l) openRequestFlow(l, type);
        }}
      />

      <RequestSwapModal
        visible={!!requestTarget && pendingRequestType === "swap"}
        target={requestTarget}
        myListings={myActiveListings}
        onClose={() => {
          setRequestTarget(null);
          setPendingRequestType(null);
        }}
        onSend={async (offeringId, message) => {
          if (!requestTarget) return;
          await sendRequest({
            requestType: "swap",
            targetListingId: requestTarget.id,
            offeringListingId: offeringId,
            message,
          });
          setRequestTarget(null);
          setPendingRequestType(null);
        }}
      />

      <RequestPayModal
        visible={!!requestTarget && pendingRequestType === "pay"}
        target={requestTarget}
        onClose={() => {
          setRequestTarget(null);
          setPendingRequestType(null);
        }}
        onSend={async (message) => {
          if (!requestTarget) return;
          await sendRequest({
            requestType: "pay",
            targetListingId: requestTarget.id,
            message,
          });
          setRequestTarget(null);
          setPendingRequestType(null);
        }}
      />

      <OxModal
        visible={showNoListingPrompt}
        onClose={() => setShowNoListingPrompt(false)}
        title="List a formal first"
        scrollable={false}
      >
        <Text style={{ color: colors.inkMuted, marginBottom: 16 }}>
          To request a swap, list your own formal first.
        </Text>
        <OxButton
          title="List a formal"
          onPress={() => {
            setShowNoListingPrompt(false);
            if (onListFormalRequired) {
              onListFormalRequired();
            } else {
              onNavigateToRequests?.();
            }
          }}
        />
      </OxModal>
    </>
  );

  return { onCardRequest, openRequestFlow, modals };
}
