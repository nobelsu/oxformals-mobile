import { useAuth } from "@/src/components/auth/useAuth";
import { useData } from "@/src/components/data/useData";
import { Chip } from "@/src/components/ui/Chip";
import { DoodleCloseButton } from "@/src/components/ui/DoodleCloseButton";
import { DoodleOutline } from "@/src/components/ui/DoodleOutline";
import { DoodleDivider } from "@/src/components/ui/DoodleDivider";
import { DoodleScrollDownButton } from "@/src/components/ui/DoodleScrollDownButton";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxInput } from "@/src/components/ui/OxInput";
import { OxRefreshControl } from "@/src/components/ui/OxRefreshControl";
import { OxSpinner } from "@/src/components/ui/OxSpinner";
import { OxText } from "@/src/components/ui/OxText";
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
import { TAP_MIN } from "@/src/constants/spacing";
import {
  activeFilterSections,
  browseFilterPredicate,
  EMPTY_BROWSE_FILTERS,
  MAX_BROWSE_GUESTS,
  type BrowseFilters,
} from "@/src/lib/data/browseFilters";
import { formatListingDay, isoToLocalDateKey } from "@/src/lib/data/format";
import { groupListingsByDay } from "@/src/lib/data/groupListingsByDay";
import type { Listing } from "@/src/lib/data/types";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
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
import { BrowseFiltersSheet } from "./BrowseFiltersSheet";
import { ListingCard } from "./ListingCard";

/** The list is flat so it stays one FlatList: a heading row, then that day's cards. */
type BrowseRow =
  | { kind: "day"; key: string; label: string }
  | { kind: "listing"; key: string; listing: Listing };

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

  const [filters, setFilters] = useState<BrowseFilters>(EMPTY_BROWSE_FILTERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [filtersModalOpen, setFiltersModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullOffset, setPullOffset] = useState(0);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [searchBarFocused, setSearchBarFocused] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const listRef = useRef<FlatList<BrowseRow>>(null);
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

  /** Colleges with open listings, most first. */
  const openColleges = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of listings) {
      if (l.status !== "active") continue;
      counts.set(l.college, (counts.get(l.college) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0]);
      })
      .map(([name]) => name);
  }, [listings]);

  const showWantToGo = isAuthenticated && wishlist.length > 0;
  const wantToGoOn = filters.wantToGo && showWantToGo;

  // The top few, plus any picked in the sheet so a pick is never hidden.
  const chipColleges = useMemo(() => {
    const top = openColleges.slice(0, BROWSE_COLLEGE_CHIP_LIMIT);
    return [...top, ...filters.colleges.filter((c) => !top.includes(c))];
  }, [openColleges, filters.colleges]);
  const moreCount = openColleges.filter((c) => !chipColleges.includes(c)).length;

  const wishlistSet = useMemo(
    () => new Set(isAuthenticated ? wishlist : []),
    [isAuthenticated, wishlist],
  );

  function toggleCollege(college: string) {
    setFilters((f) => ({
      ...f,
      colleges: f.colleges.includes(college)
        ? f.colleges.filter((c) => c !== college)
        : [...f.colleges, college],
    }));
  }

  /** Open, upcoming, someone else's, and matching the search box. */
  const searchedListings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return listings
      .filter((l) => l.status === "active")
      .filter((l) => Date.parse(l.dateTime) > Date.now())
      .filter((l) => !user || l.ownerUserId !== user.id)
      .filter((l) => {
        // No owner, no card: keep it out so a day heading never sits alone.
        const owner = getUser(l.ownerUserId);
        if (!owner) return false;
        if (!q) return true;
        const parts = [l.college, l.menu, l.message, l.year, l.role, owner.name];
        return parts.some((p) => (p ?? "").toLowerCase().includes(q));
      });
  }, [listings, user, searchQuery, getUser]);

  const listingsFor = useCallback(
    (f: BrowseFilters) =>
      searchedListings.filter(
        browseFilterPredicate(f, {
          todayKey: isoToLocalDateKey(new Date().toISOString()),
          dateKeyOf: (l) => isoToLocalDateKey(l.dateTime),
          wishlist: wishlistSet,
        }),
      ),
    [searchedListings, wishlistSet],
  );
  const countFor = useCallback(
    (f: BrowseFilters) => listingsFor(f).length,
    [listingsFor],
  );

  const browseListings = useMemo(() => listingsFor(filters), [listingsFor, filters]);

  const rows = useMemo(() => {
    const out: BrowseRow[] = [];
    for (const group of groupListingsByDay(browseListings)) {
      out.push({
        kind: "day",
        key: `day-${group.dateKey}`,
        label: formatListingDay(group.dateTime),
      });
      for (const listing of group.listings) {
        out.push({ kind: "listing", key: listing.id, listing });
      }
    }
    return out;
  }, [browseListings]);

  const formalCount = browseListings.length;
  const formalCountText = formalCountLabel(formalCount);

  const hasActiveFilters = activeFilterSections(filters) > 0;

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
          <View style={styles.titleRow}>
            <Text
              style={[tabScreenTitleText, { color: colors.ink }]}
              accessibilityRole="header"
            >
              Discover
            </Text>
            <Pressable
              onPress={() => router.push("/colleges")}
              hitSlop={10}
              style={styles.collegesLink}
              accessibilityRole="button"
              accessibilityLabel="Colleges"
            >
              <Ionicons name="school-outline" size={18} color={colors.ink} />
              <Text style={[styles.collegesLinkText, { color: colors.ink }]}>
                Colleges
              </Text>
            </Pressable>
          </View>
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
              placeholder="Search college, menu, host..."
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
            <Pressable
              onPress={() => setFiltersModalOpen(true)}
              disabled={searchBarFocused}
              pointerEvents={searchBarFocused ? "none" : "auto"}
              accessibilityRole="button"
              accessibilityLabel="Open filters"
              accessibilityState={{ expanded: filtersModalOpen }}
              hitSlop={10}
              style={({ pressed }) => ({
                opacity: searchBarFocused ? 0.3 : pressed ? 0.85 : 1,
                transform: [{ scale: pressed && !searchBarFocused ? 0.98 : 1 }],
              })}
            >
              <DoodleOutline
                seed={19}
                fill={colors.paper}
                stroke={colors.ink}
                contentStyle={{
                  ...styles.filterBtn,
                  width: BROWSE_CALENDAR_BTN_SIZE,
                  height: BROWSE_CALENDAR_BTN_SIZE,
                }}
              >
                <Ionicons name="filter-outline" size={22} color={colors.ink} />
                {hasActiveFilters ? (
                  <View
                    style={[styles.filterBadge, { backgroundColor: colors.accent }]}
                  />
                ) : null}
              </DoodleOutline>
            </Pressable>
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
              selected={filters.colleges.length === 0 && !wantToGoOn}
              onPress={() =>
                setFilters((f) => ({ ...f, colleges: [], wantToGo: false }))
              }
            />
            {showWantToGo ? (
              <Chip
                label="Want to go"
                selected={filters.wantToGo}
                onPress={() =>
                  setFilters((f) => ({ ...f, wantToGo: !f.wantToGo }))
                }
              />
            ) : null}
            {chipColleges.map((c) => (
              <Chip
                key={c}
                label={c}
                selected={filters.colleges.includes(c)}
                onPress={() => toggleCollege(c)}
              />
            ))}
            {moreCount > 0 ? (
              <Chip
                label={`+${moreCount}`}
                onPress={() => setFiltersModalOpen(true)}
              />
            ) : null}
          </View>
        </CollapsibleBrowseSection>
        <Text
          style={[styles.resultCount, { color: colors.inkMuted }]}
          accessibilityRole="text"
          accessibilityLabel={`${formalCountText}, matching your filters`}
        >
          {formalCountText}
        </Text>
        <DoodleDivider seed={77} marginVertical={0} />
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
          data={rows}
          keyExtractor={(item) => item.key}
          onScroll={onListScroll}
          scrollEventThrottle={16}
          refreshControl={
            <OxRefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          renderItem={({ item }) => {
            if (item.kind === "day") {
              return (
                <OxText
                  style={[styles.dayHeading, { color: colors.ink }]}
                  accessibilityRole="header"
                >
                  {item.label}
                </OxText>
              );
            }
            const { listing } = item;
            const owner = getUser(listing.ownerUserId);
            if (!owner) return null;
            return (
              <View style={styles.cardWrap}>
                <ListingCard
                  listing={listing}
                  owner={owner}
                  variant="compact"
                  timeOnly
                  onPress={() => router.push(`/listing/${listing.id}`)}
                  onRequest={() => onCardRequest(listing)}
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
                No formals
              </Text>
              {hasActiveFilters ? (
                <OxButton
                  title="Clear filters"
                  variant="secondary"
                  onPress={() => setFilters(EMPTY_BROWSE_FILTERS)}
                />
              ) : null}
            </SketchCard>
          }
          contentContainerStyle={styles.list}
        />
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

      <BrowseFiltersSheet
        visible={filtersModalOpen}
        onClose={() => setFiltersModalOpen(false)}
        value={filters}
        onApply={setFilters}
        countFor={countFor}
        colleges={openColleges}
        showWantToGo={showWantToGo}
        maxGuests={MAX_BROWSE_GUESTS}
      />

      {modals}
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  collegesLink: { flexDirection: "row", alignItems: "center", gap: 5 },
  collegesLinkText: { fontSize: 17, fontFamily: FONT_DISPLAY },
  root: { flex: 1 },
  listArea: { flex: 1 },
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
    zIndex: 1,
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
  dayHeading: { fontSize: 20, marginTop: 12, marginBottom: 8 },
  emptyCard: { marginTop: 24 },
  emptyTitle: {
    fontSize: 22,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 8,
  },
  filterBtn: {
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadge: {
    position: "absolute",
    right: -4,
    top: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
