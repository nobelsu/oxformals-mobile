import { RequestList } from "@/src/components/swap/history/RequestList";
import type { RequestDirection } from "@/src/components/swap/history/constants";
import { useHistoryRequests } from "@/src/components/swap/history/useHistoryRequests";
import { RequestDirectionToggle } from "@/src/components/swap/history/RequestDirectionToggle";
import {
  SCREEN_PADDING,
  TAB_SCROLL_EXTRA_BOTTOM,
} from "@/src/constants/layout";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";

function parseDirection(value: string | string[] | undefined): RequestDirection {
  if (value === "outgoing") return "outgoing";
  return "incoming";
}

export default function HistoryRequestsScreen() {
  const { colors } = useOxTheme();
  const router = useRouter();
  const { direction: directionParam } = useLocalSearchParams<{
    direction?: string;
  }>();
  const [direction, setDirection] = useState<RequestDirection>(() =>
    parseDirection(directionParam),
  );

  useEffect(() => {
    setDirection(parseDirection(directionParam));
  }, [directionParam]);

  const requests = useHistoryRequests(direction);

  return (
    <>
      <Stack.Screen options={{ title: "Requests", headerShown: true }} />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { backgroundColor: colors.bg },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <RequestDirectionToggle
          value={direction}
          onChange={(next) => {
            setDirection(next);
            router.setParams({ direction: next });
          }}
        />
        <RequestList direction={direction} requests={requests} />
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
});
