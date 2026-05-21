import { HistorySectionHeader } from "@/src/components/swap/history/HistorySectionHeader";
import { RequestList } from "@/src/components/swap/history/RequestList";
import {
  HISTORY_REQUEST_PREVIEW,
  type RequestDirection,
} from "@/src/components/swap/history/constants";
import { useHistoryRequests } from "@/src/components/swap/history/useHistoryRequests";
import { RequestDirectionToggle } from "@/src/components/swap/history/RequestDirectionToggle";
import { SECTION_GAP } from "@/src/constants/layout";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

type Props = {
  hasPastListings?: boolean;
};

export function RequestsSection({ hasPastListings }: Props) {
  const router = useRouter();
  const [direction, setDirection] = useState<RequestDirection>("incoming");
  const allRequests = useHistoryRequests(direction);
  const preview = allRequests.slice(0, HISTORY_REQUEST_PREVIEW);

  return (
    <View
      style={[styles.section, hasPastListings && { marginTop: SECTION_GAP }]}
    >
      <HistorySectionHeader
        title="Requests"
        showSeeAll
        onSeeAll={() =>
          router.push({
            pathname: "/history/requests",
            params: { direction },
          })
        }
      />
      <RequestDirectionToggle value={direction} onChange={setDirection} />
      <RequestList direction={direction} requests={preview} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 0 },
});
