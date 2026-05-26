import { useAuth } from "@/src/components/auth/useAuth";
import { useData } from "@/src/components/data/useData";
import { MyListingCard } from "@/src/components/swap/MyListingCard";
import {
  CAROUSEL_GAP,
  CAROUSEL_PEEK,
  SCREEN_PADDING,
} from "@/src/constants/layout";
import { oxText } from "@/src/constants/oxText";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { lightImpact } from "@/src/lib/haptics";
import type { Listing } from "@/src/lib/data/types";
import { seededOffset, STROKE_DASH, STROKE_WIDTH } from "@/src/lib/ui/sketchStroke";
import { useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewToken,
} from "react-native";
import Svg, { Circle } from "react-native-svg";

const viewabilityConfig = { viewAreaCoveragePercentThreshold: 50 };

type Props = {
  listings: Listing[];
  pendingReviewSet?: Set<string>;
  pendingAttendanceSet?: Set<string>;
};

export function PastListingsCarousel({
  listings,
  pendingReviewSet = new Set(),
  pendingAttendanceSet = new Set(),
}: Props) {
  const router = useRouter();
  const { colors } = useOxTheme();
  const { width: windowWidth } = useWindowDimensions();
  const { user } = useAuth();
  const { getUser } = useData();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Listing>>(null);

  const isMulti = listings.length > 1;
  const viewportWidth = windowWidth - SCREEN_PADDING * 2;
  const itemWidth = isMulti
    ? windowWidth - SCREEN_PADDING - CAROUSEL_PEEK
    : viewportWidth;
  const snapInterval = itemWidth + CAROUSEL_GAP;

  const profile = user
    ? { year: user.year, role: user.role }
    : undefined;

  const scrollToIndex = useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0 || nextIndex >= listings.length) return;
      listRef.current?.scrollToOffset({
        offset: nextIndex * snapInterval,
        animated: true,
      });
      lightImpact();
    },
    [listings.length, snapInterval],
  );

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const next = viewableItems[0]?.index;
      if (next != null) setIndex(next);
    },
    [],
  );

  const onScrollToIndexFailed = useCallback(
    (info: { index: number }) => {
      listRef.current?.scrollToOffset({
        offset: info.index * snapInterval,
        animated: true,
      });
    },
    [snapInterval],
  );

  const renderCard = useCallback(
    (listing: Listing) => {
      const members = listing.members
        .map(getUser)
        .filter((u): u is NonNullable<typeof u> => !!u);
      return (
        <MyListingCard
          listing={listing}
          pendingRequestCount={0}
          profile={profile}
          memberUsers={members}
          compact
          canConfirmAttendance={pendingAttendanceSet.has(listing.id)}
          canRate={pendingReviewSet.has(listing.id)}
          onPress={() => router.push(`/listing/${listing.id}`)}
        />
      );
    },
    [getUser, profile, router, pendingReviewSet, pendingAttendanceSet],
  );

  if (!user || listings.length === 0) return null;

  const dotsDisabled = !isMulti;
  const counterHint = isMulti ? " · swipe to browse" : "";

  return (
    <View style={styles.root}>
      {isMulti ? (
        <View style={styles.listBleed}>
          <FlatList
            ref={listRef}
            data={listings}
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={snapInterval}
            snapToAlignment="start"
            disableIntervalMomentum
            bounces={false}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              { paddingHorizontal: SCREEN_PADDING },
            ]}
            style={{ width: windowWidth }}
            getItemLayout={(_, i) => ({
              length: snapInterval,
              offset: snapInterval * i,
              index: i,
            })}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.item,
                  { width: itemWidth, marginRight: CAROUSEL_GAP },
                ]}
              >
                {renderCard(item)}
              </View>
            )}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            onScrollToIndexFailed={onScrollToIndexFailed}
          />
        </View>
      ) : (
        <View style={{ width: viewportWidth }}>{renderCard(listings[0])}</View>
      )}

      <View style={styles.footerCenter}>
        <View style={styles.dots}>
          {listings.map((item, i) => (
            <Pressable
              key={item.id}
              onPress={() => scrollToIndex(i)}
              disabled={dotsDisabled}
              accessibilityRole="button"
              accessibilityLabel={`Past listing ${i + 1} of ${listings.length}`}
              accessibilityState={{ selected: i === index, disabled: dotsDisabled }}
              hitSlop={8}
            >
              <Svg width={14} height={14}>
                <Circle
                  cx={7 + seededOffset(99, i)}
                  cy={7 + seededOffset(99, i + 4)}
                  r={5}
                  fill={i === index ? colors.accent : colors.bg}
                  stroke={colors.ink}
                  strokeWidth={STROKE_WIDTH}
                  strokeDasharray={i === index ? undefined : STROKE_DASH}
                />
              </Svg>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.counter, oxText, { color: colors.inkMuted }]}>
          {index + 1} of {listings.length}
          {counterHint}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: "visible",
  },
  listBleed: {
    marginHorizontal: -SCREEN_PADDING,
    overflow: "visible",
  },
  listContent: {
    paddingRight: SCREEN_PADDING,
  },
  item: {
    flexShrink: 0,
  },
  footerCenter: {
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  counter: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
  },
});
