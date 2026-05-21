import { useAuth } from "@/src/components/auth/useAuth";
import { useData } from "@/src/components/data/useData";
import { Chip } from "@/src/components/ui/Chip";
import { DoodleCalendarButton } from "@/src/components/ui/DoodleCalendarButton";
import { DoodleCloseButton } from "@/src/components/ui/DoodleCloseButton";
import { DoodleScrollDownButton } from "@/src/components/ui/DoodleScrollDownButton";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxInput } from "@/src/components/ui/OxInput";
import { OxModal } from "@/src/components/ui/OxModal";
import { OxRefreshControl } from "@/src/components/ui/OxRefreshControl";
import { OxSpinner } from "@/src/components/ui/OxSpinner";
import { ScrollEdgeFade } from "@/src/components/ui/ScrollEdgeFade";
import { SketchCard } from "@/src/components/ui/SketchCard";
import { useListFormalModal } from "@/src/components/listing/ListFormalModalProvider";
import { useListingRequest } from "@/src/components/swap/listingRequestFlow";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import {
  CARD_GAP,
  DISPLAY_SECTION,
  SCREEN_PADDING,
  TAB_SCREEN_TITLE_PADDING_TOP,
  TAB_SCROLL_EXTRA_BOTTOM,
  tabScreenTitleText,
} from "@/src/constants/layout";
import { space, TAP_MIN } from "@/src/constants/spacing";
import { isoToLocalDateKey } from "@/src/lib/data/format";
import type { Listing } from "@/src/lib/data/types";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import {
  BrowseDateCalendar,
  BROWSE_DATE_CALENDAR_INSTRUCTIONS,
} from "./BrowseDateCalendar";
import { ListingCard } from "./ListingCard";

const MY_FORMALS = "__my_formals__";
const BROWSE_COLLEGE_CHIP_LIMIT = 3;
const HEADER_COLLAPSE_DISTANCE = 72;
/** Discover title line + marginBottom from styles.discoverTitle */
const DISCOVER_SECTION_HEIGHT = DISPLAY_SECTION + 12;
const CHIPS_SECTION_DEFAULT_HEIGHT = 48;
const SEARCH_FOCUS_ANIM_MS = 220;
const BROWSE_SEARCH_SEED = 42;
const BROWSE_SEARCH_ROW_GAP = 8;
const BROWSE_CALENDAR_BTN_SIZE = TAP_MIN;
const SCROLL_TOP_FAB_THRESHOLD = 120;

type CollapsibleBrowseSectionProps = {
  scrollY: SharedValue<number>;
  focusBoost?: SharedValue<number>;
  maxHeight: SharedValue<number>;
  marginTop?: number;
  marginBottom?: number;
  accessibilityHidden: boolean;
  children: ReactNode;
};

function CollapsibleBrowseSection({
  scrollY,
  focusBoost,
  maxHeight,
  marginTop = 0,
  marginBottom = 0,
  accessibilityHidden,
  children,
}: CollapsibleBrowseSectionProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const scrollProgress = interpolate(
      scrollY.value,
      [0, HEADER_COLLAPSE_DISTANCE],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const focusProgress = focusBoost?.value ?? 0;
    const progress = Math.max(scrollProgress, focusProgress);
    const expandedHeight = maxHeight.value + marginTop + marginBottom;
    const collapse = 1 - progress;
    return {
      height: expandedHeight * collapse,
      opacity: collapse,
      marginTop: marginTop * collapse,
      marginBottom: marginBottom * collapse,
      overflow: "hidden" as const,
    };
  });

  return (
    <Animated.View
      style={animatedStyle}
      accessibilityElementsHidden={accessibilityHidden}
      importantForAccessibility={
        accessibilityHidden ? "no-hide-descendants" : "auto"
      }
    >
      {children}
    </Animated.View>
  );
}

function formalCountLabel(count: number): string {
  if (count === 0) return "No formals available";
  if (count === 1) return "1 formal available";
  return `${count} formals available`;
}

type Props = {
  onSignInRequired: () => void;
};

export function BrowseTab({ onSignInRequired }: Props) {
  const router = useRouter();
  const { colors } = useOxTheme();
  const { user, isAuthenticated } = useAuth();
  const { listings, wishlist, getUser } = useData();
  const { openListFormal } = useListFormalModal();
  const { onCardRequest, modals } = useListingRequest({
    onSignInRequired,
    onListFormalRequired: openListFormal,
  });

  const [collegeFilter, setCollegeFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pickedCalendarDates, setPickedCalendarDates] = useState<string[]>([]);
  const [filtersModalOpen, setFiltersModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullOffset, setPullOffset] = useState(0);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [searchBarFocused, setSearchBarFocused] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const listRef = useRef<FlatList<Listing>>(null);
  const scrollY = useSharedValue(0);
  const searchFocused = useSharedValue(0);
  const discoverMaxHeight = useSharedValue(DISCOVER_SECTION_HEIGHT);
  const chipsMaxHeight = useSharedValue(CHIPS_SECTION_DEFAULT_HEIGHT);

  const handleSearchFocusChange = useCallback((focused: boolean) => {
    setSearchBarFocused(focused);
    searchFocused.value = withTiming(focused ? 1 : 0, {
      duration: SEARCH_FOCUS_ANIM_MS,
    });
  }, [searchFocused]);

  const showRefreshSpinner = refreshing || pullOffset > 36;

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      setPullOffset(0);
    }, 600);
  };

  const scrollToTop = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const updateScrollFromList = useCallback(
    (y: number) => {
      if (!refreshing) {
        setPullOffset(y < 0 ? -y : 0);
      }
      const show = Math.max(0, y) > SCROLL_TOP_FAB_THRESHOLD;
      setShowScrollTop((prev) => (prev === show ? prev : show));
    },
    [refreshing],
  );

  const onListScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      const y = e.contentOffset.y;
      scrollY.value = Math.max(0, y);
      runOnJS(updateScrollFromList)(y);
    },
  });

  useAnimatedReaction(
    () =>
      scrollY.value >= HEADER_COLLAPSE_DISTANCE || searchFocused.value >= 0.5,
    (collapsed, prev) => {
      if (collapsed !== prev) {
        runOnJS(setHeaderCollapsed)(collapsed);
      }
    },
  );

  const calendarAnimatedStyle = useAnimatedStyle(() => ({
    width: interpolate(
      searchFocused.value,
      [0, 1],
      [BROWSE_CALENDAR_BTN_SIZE, 0],
      Extrapolation.CLAMP,
    ),
    marginLeft: interpolate(
      searchFocused.value,
      [0, 1],
      [BROWSE_SEARCH_ROW_GAP, 0],
      Extrapolation.CLAMP,
    ),
    opacity: interpolate(searchFocused.value, [0, 1], [1, 0], Extrapolation.CLAMP),
    overflow: "hidden" as const,
  }));

  const { topBrowseColleges, moreCount } = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of listings) {
      if (l.status !== "active") continue;
      counts.set(l.college, (counts.get(l.college) ?? 0) + 1);
    }
    const sorted = Array.from(counts.entries()).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    });
    return {
      topBrowseColleges: sorted.slice(0, BROWSE_COLLEGE_CHIP_LIMIT).map(([n]) => n),
      moreCount: Math.max(0, sorted.length - BROWSE_COLLEGE_CHIP_LIMIT),
    };
  }, [listings]);

  const topBrowseCollegesSet = useMemo(
    () => new Set(topBrowseColleges),
    [topBrowseColleges],
  );

  const wishlistSet = useMemo(() => new Set(wishlist), [wishlist]);

  const effectiveCollegeFilter = useMemo(() => {
    if (collegeFilter === MY_FORMALS && (!isAuthenticated || wishlist.length === 0)) {
      return null;
    }
    if (collegeFilter !== null && collegeFilter !== MY_FORMALS) {
      return topBrowseCollegesSet.has(collegeFilter) ? collegeFilter : null;
    }
    if (collegeFilter === MY_FORMALS) return MY_FORMALS;
    return null;
  }, [collegeFilter, isAuthenticated, wishlist.length, topBrowseCollegesSet]);

  const collegeFilteredListings = useMemo(
    () =>
      listings
        .filter((l) => l.status === "active")
        .filter((l) => Date.parse(l.dateTime) > Date.now())
        .filter((l) => !user || l.ownerUserId !== user.id)
        .filter((l) => {
          if (!effectiveCollegeFilter) return true;
          if (effectiveCollegeFilter === MY_FORMALS) return wishlistSet.has(l.college);
          return l.college === effectiveCollegeFilter;
        }),
    [listings, user, effectiveCollegeFilter, wishlistSet],
  );

  const browseListings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const dateSet =
      pickedCalendarDates.length > 0 ? new Set(pickedCalendarDates) : null;
    return collegeFilteredListings
      .filter((l) => {
        if (!dateSet) return true;
        const key = isoToLocalDateKey(l.dateTime);
        return dateSet.has(key);
      })
      .filter((l) => {
        if (!q) return true;
        const owner = getUser(l.ownerUserId);
        const parts = [
          l.college,
          l.menu,
          l.message,
          l.year,
          l.role,
          owner?.name ?? "",
        ];
        return parts.some((p) => (p ?? "").toLowerCase().includes(q));
      })
      .sort((a, b) => +new Date(a.dateTime) - +new Date(b.dateTime));
  }, [collegeFilteredListings, pickedCalendarDates, searchQuery, getUser]);

  const formalCount = browseListings.length;
  const formalCountText = formalCountLabel(formalCount);

  const hasActiveFilters = pickedCalendarDates.length > 0;
  const hasCollegeMatches = collegeFilteredListings.length > 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View
        style={[
          styles.stickyHeader,
          { backgroundColor: colors.bg, paddingHorizontal: SCREEN_PADDING },
        ]}
      >
        <CollapsibleBrowseSection
          scrollY={scrollY}
          focusBoost={searchFocused}
          maxHeight={discoverMaxHeight}
          marginBottom={12}
          accessibilityHidden={headerCollapsed}
        >
          <Text
            style={[tabScreenTitleText, { color: colors.ink }]}
            accessibilityRole="header"
          >
            Discover
          </Text>
        </CollapsibleBrowseSection>
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrap}>
            <View style={styles.searchIcon} pointerEvents="none">
              <Ionicons
                name="search-outline"
                size={18}
                color={colors.inkMuted}
              />
            </View>
            <OxInput
              seed={BROWSE_SEARCH_SEED}
              placeholder="Find your next formal..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocusChange={handleSearchFocusChange}
              focusStroke={colors.accent}
              wrapperStyle={styles.searchOutline}
              style={[
                styles.searchInput,
                searchQuery !== "" ? styles.searchInputWithClear : null,
              ]}
            />
            {searchQuery !== "" ? (
              <View style={styles.clearSearch}>
                <DoodleCloseButton
                  onPress={() => setSearchQuery("")}
                  accessibilityLabel="Clear search"
                  seed={14}
                  size={28}
                />
              </View>
            ) : null}
          </View>
          <Animated.View
            style={calendarAnimatedStyle}
            accessibilityElementsHidden={searchBarFocused}
            importantForAccessibility={
              searchBarFocused ? "no-hide-descendants" : "auto"
            }
          >
            <DoodleCalendarButton
              onPress={() => setFiltersModalOpen(true)}
              accessibilityLabel="Open date filter"
              accessibilityState={{ expanded: filtersModalOpen }}
              pointerEvents={searchBarFocused ? "none" : "auto"}
              showBadge={hasActiveFilters}
            />
          </Animated.View>
        </View>

        <CollapsibleBrowseSection
          scrollY={scrollY}
          focusBoost={searchFocused}
          maxHeight={chipsMaxHeight}
          marginTop={12}
          accessibilityHidden={headerCollapsed}
        >
          <View
            style={styles.chips}
            onLayout={(e) => {
              chipsMaxHeight.value = e.nativeEvent.layout.height;
            }}
          >
            <Chip
              label="All colleges"
              selected={effectiveCollegeFilter === null}
              onPress={() => setCollegeFilter(null)}
            />
            {isAuthenticated && wishlist.length > 0 && (
              <Chip
                label="My favourites"
                selected={effectiveCollegeFilter === MY_FORMALS}
                onPress={() => setCollegeFilter(MY_FORMALS)}
              />
            )}
            {topBrowseColleges.map((c) => (
              <Chip
                key={c}
                label={c}
                selected={effectiveCollegeFilter === c}
                onPress={() => setCollegeFilter(c)}
              />
            ))}
            {moreCount > 0 && <Chip label={`+${moreCount}`} />}
          </View>
        </CollapsibleBrowseSection>
        <Text
          style={[styles.resultCount, { color: colors.inkMuted }]}
          accessibilityRole="text"
          accessibilityLabel={`${formalCountText}, matching your filters`}
        >
          {formalCountText}
        </Text>
      </View>
      <View style={styles.listArea}>
        {showRefreshSpinner ? (
          <View style={styles.refreshIndicator} pointerEvents="none">
            <OxSpinner size="md" />
          </View>
        ) : null}
        <Animated.FlatList
          ref={listRef}
          style={styles.listScroll}
          data={browseListings}
          keyExtractor={(item) => item.id}
          onScroll={onListScroll}
          scrollEventThrottle={16}
          refreshControl={
            <OxRefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          renderItem={({ item }) => {
            const owner = getUser(item.ownerUserId);
            if (!owner) return null;
            return (
              <View style={styles.cardWrap}>
                <ListingCard
                  listing={item}
                  owner={owner}
                  variant="compact"
                  onPress={() => router.push(`/listing/${item.id}`)}
                  onRequest={() => onCardRequest(item)}
                  disabled={!isAuthenticated}
                  disabledLabel={
                    isAuthenticated ? undefined : "Sign in to request"
                  }
                />
              </View>
            );
          }}
          ListEmptyComponent={
            <SketchCard seed={404} padding={24} style={styles.emptyCard}>
              <Text
                style={[
                  styles.emptyTitle,
                  { color: colors.ink, fontFamily: FONT_DISPLAY },
                ]}
              >
                Nothing here yet
              </Text>
              <Text style={[styles.empty, { color: colors.inkMuted }]}>
                {hasCollegeMatches
                  ? "Nothing matches your filters. Try another college, open the calendar to choose dates, or clear your search."
                  : "No open swaps here yet. Try another college or list your own formal."}
              </Text>
            </SketchCard>
          }
          contentContainerStyle={styles.list}
        />
        <ScrollEdgeFade edge="top" color={colors.bg} />
        <ScrollEdgeFade edge="bottom" color={colors.bg} />
        {showScrollTop ? (
          <View style={styles.scrollFab} pointerEvents="box-none">
            <DoodleScrollDownButton
              direction="up"
              seed={103}
              accessibilityLabel="Scroll to top"
              onPress={scrollToTop}
            />
          </View>
        ) : null}
      </View>

      <OxModal
        visible={filtersModalOpen}
        onClose={() => setFiltersModalOpen(false)}
        title="Dates"
        showCloseButton={false}
      >
        <Text style={[styles.modalInstructions, { color: colors.inkMuted }]}>
          {BROWSE_DATE_CALENDAR_INSTRUCTIONS}
        </Text>
        <BrowseDateCalendar
          embedded
          value={pickedCalendarDates}
          onChange={setPickedCalendarDates}
        />
        <OxButton
          title="Done"
          onPress={() => setFiltersModalOpen(false)}
          style={styles.doneBtn}
        />
      </OxModal>

      {modals}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  listArea: { flex: 1, position: "relative" },
  scrollFab: {
    position: "absolute",
    right: SCREEN_PADDING,
    bottom: 12,
    zIndex: 2,
  },
  refreshIndicator: {
    position: "absolute",
    top: 8,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 3,
  },
  stickyHeader: {
    paddingTop: TAB_SCREEN_TITLE_PADDING_TOP,
    paddingBottom: CARD_GAP,
    zIndex: 1,
    elevation: 1,
  },
  listScroll: { flex: 1, width: "100%" },
  list: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 32 + TAB_SCROLL_EXTRA_BOTTOM,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchInputWrap: {
    flex: 1,
    position: "relative",
    justifyContent: "center",
  },
  searchOutline: {
    flex: 1,
  },
  searchInput: {
    paddingLeft: 36,
    paddingRight: 12,
    letterSpacing: -0.5,
  },
  searchInputWithClear: {
    paddingRight: 36,
  },
  searchIcon: {
    position: "absolute",
    left: 11,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    width: 18,
    zIndex: 1,
  },
  clearSearch: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    width: 32,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  resultCount: {
    fontSize: 13,
    fontFamily: FONT_DISPLAY,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 8,
  },
  cardWrap: { marginBottom: CARD_GAP },
  emptyCard: { marginTop: 24 },
  emptyTitle: {
    fontSize: 22,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 8,
  },
  empty: {
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
    fontFamily: FONT_DISPLAY,
  },
  modalInstructions: {
    fontFamily: FONT_DISPLAY,
    fontSize: 14,
    lineHeight: 20,
    marginTop: -space[3],
    marginBottom: space[5],
  },
  doneBtn: {
    marginTop: 16,
  },
});
