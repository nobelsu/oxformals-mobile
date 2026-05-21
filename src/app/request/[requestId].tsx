import { useAuth } from "@/src/components/auth/useAuth";
import { useData } from "@/src/components/data/useData";
import { RequestDetailContent } from "@/src/components/swap/RequestDetailContent";
import { OxLoadingView } from "@/src/components/ui/OxLoadingView";
import {
  SCREEN_PADDING,
  TAB_SCROLL_EXTRA_BOTTOM,
} from "@/src/constants/layout";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { oxText } from "@/src/constants/oxText";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function RequestDetailScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const router = useRouter();
  const { colors } = useOxTheme();
  const { user } = useAuth();
  const {
    ready,
    requests,
    getUser,
    getListing,
    acceptRequest,
    declineRequest,
    withdrawRequest,
  } = useData();

  const request = requests.find((r) => r.id === requestId);

  if (!ready) {
    return <OxLoadingView fill />;
  }

  if (!request || !user) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.bg }]}>
        <Stack.Screen options={{ title: "Request" }} />
        <Text style={[oxText, { color: colors.inkMuted }]}>
          Request not found.
        </Text>
      </View>
    );
  }

  const isIncoming = user.id === request.toUserId;
  const counterpartyId = isIncoming ? request.fromUserId : request.toUserId;
  const counterparty = getUser(counterpartyId);

  if (!counterparty) {
    return <OxLoadingView fill />;
  }

  const targetListing = getListing(request.targetListingId);
  const offeringListing = request.offeringListingId
    ? getListing(request.offeringListingId)
    : undefined;

  const handleAccept = () => {
    acceptRequest(request.id);
    router.back();
  };

  const handleDecline = () => {
    declineRequest(request.id);
    router.back();
  };

  const handleWithdraw = () => {
    withdrawRequest(request.id);
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ title: counterparty.name ?? "Request" }} />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { backgroundColor: colors.bg },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <RequestDetailContent
          request={request}
          isIncoming={isIncoming}
          counterparty={counterparty}
          targetListing={targetListing}
          offeringListing={offeringListing}
          getUser={getUser}
          onAccept={isIncoming ? handleAccept : undefined}
          onDecline={isIncoming ? handleDecline : undefined}
          onWithdraw={!isIncoming ? handleWithdraw : undefined}
        />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: SCREEN_PADDING,
    paddingBottom: TAB_SCROLL_EXTRA_BOTTOM + 32,
    flexGrow: 1,
  },
  notFound: {
    flex: 1,
    padding: SCREEN_PADDING,
    justifyContent: "center",
  },
});
