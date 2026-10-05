import { api } from "@/convex/_generated/api";
import { ClaimScreen } from "@/src/components/invites/ClaimScreen";
import { useMutation } from "convex/react";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";

const OUTCOME: Record<"joined" | "friends" | "own" | "invalid", string> = {
  joined: "You're now friends with the person who invited you.",
  friends: "You're now friends.",
  own: "That's your own invite link.",
  invalid: "That invite link has expired or isn't valid.",
};

/** oxformals.com/i/<code> opened in the app: connect to whoever sent it. */
export default function InviteLinkScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const claimInvite = useMutation(api.invites.claimInvite);
  const [openedAt] = useState(() => Date.now());
  const claim = useCallback(
    async () => OUTCOME[await claimInvite({ code: code ?? "", openedAt })],
    [claimInvite, code, openedAt],
  );
  return <ClaimScreen title="Invite" claim={claim} />;
}
