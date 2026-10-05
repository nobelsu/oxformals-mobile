import { api } from "@/convex/_generated/api";
import { ClaimScreen } from "@/src/components/invites/ClaimScreen";
import { useMutation } from "convex/react";
import { useLocalSearchParams } from "expo-router";
import { useCallback } from "react";

/** oxformals.com/s/<token> opened in the app: take the seat a friend saved. */
export default function SeatLinkScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const claimSeatLink = useMutation(api.seatLinks.claimSeatLink);
  const claim = useCallback(async () => {
    await claimSeatLink({ token: token ?? "" });
    return "Seat saved. Say if you're in on your feed.";
  }, [claimSeatLink, token]);
  return <ClaimScreen title="Your seat" claim={claim} />;
}
