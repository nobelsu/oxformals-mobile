import { OxButton } from "@/src/components/ui/OxButton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { chatConversationHref } from "@/src/lib/chat/navigation";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import type { ViewStyle } from "react-native";

type Props = {
  listingId: Id<"listings">;
  memberCount: number;
  style?: ViewStyle;
};

export function ListingGroupChatButton({
  listingId,
  memberCount,
  style,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const existingConversationId = useQuery(api.chat.getListingGroupConversation, {
    listingId,
  });

  const getOrCreate = useMutation(api.chat.getOrCreateListingGroupChat);

  const handlePress = useCallback(async () => {
    setLoading(true);
    try {
      const conversationId = await getOrCreate({ listingId });
      router.push(chatConversationHref(conversationId));
    } finally {
      setLoading(false);
    }
  }, [getOrCreate, listingId, router]);

  if (memberCount < 2) return null;

  const label =
    existingConversationId === undefined
      ? "Group chat"
      : existingConversationId
        ? "Open group chat"
        : "Group chat";

  return (
    <OxButton
      title={loading ? "Opening…" : label}
      variant="secondary"
      loading={loading}
      onPress={() => void handlePress()}
      style={style}
    />
  );
}
