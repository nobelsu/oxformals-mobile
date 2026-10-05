import { api } from "@/convex/_generated/api";
import { slugToCollege } from "@/lib/data/collegeSlug";
import {
  COLLEGE_REVIEW_CATEGORIES,
  type CollegeReviewSort,
} from "@/lib/data/collegeReviews";
import { useAuth } from "@/src/components/auth/useAuth";
import { CollegeGuide } from "@/src/components/colleges/CollegeGuide";
import { CollegeStamp } from "@/src/components/colleges/CollegeStamp";
import { CollegeReviewCard } from "@/src/components/reviews/CollegeReviewCard";
import { StarRating } from "@/src/components/reviews/StarRating";
import { Avatar } from "@/src/components/ui/Avatar";
import { Chip } from "@/src/components/ui/Chip";
import { OxSpinner } from "@/src/components/ui/OxSpinner";
import { OxText } from "@/src/components/ui/OxText";
import { SketchCard } from "@/src/components/ui/SketchCard";
import { CARD_GAP, SCREEN_PADDING, SECTION_GAP } from "@/src/constants/layout";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import {
  formatListingDate,
  formatListingSeatsLabel,
  formatPrice,
} from "@/src/lib/data/format";
import { mapListing } from "@/src/lib/data/mapConvex";
import type { Listing } from "@/src/lib/data/types";
import { errorMessage } from "@/src/lib/errorMessage";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState, type ReactNode } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";

const REVIEW_SORTS: { id: CollegeReviewSort; label: string }[] = [
  { id: "top", label: "Top" },
  { id: "recent", label: "Recent" },
];

function paymentLabel(l: Listing): string {
  if (l.listingType === "swap") return "Swap";
  if (l.listingType === "both") return "Swap or pay";
  return l.price !== undefined ? formatPrice(l.price) : "Pay";
}

function Section({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  const { colors } = useOxTheme();
  return (
    <View>
      <View style={styles.sectionHead}>
        <OxText
          accessibilityRole="header"
          style={[styles.sectionTitle, { color: colors.ink }]}
        >
          {title}
        </OxText>
        {aside}
      </View>
      {children}
    </View>
  );
}

/** One college: its rating, guide, upcoming formals, reviews and members. */
export default function CollegeScreen() {
  const { colors } = useOxTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const college = slugToCollege(slug ?? "");

  return (
    <>
      <Stack.Screen options={{ title: "College", headerShown: true }} />
      {college ? (
        <CollegeBody college={college} />
      ) : (
        <View style={[styles.missing, { backgroundColor: colors.bg }]}>
          <OxText style={[styles.note, { color: colors.inkMuted }]}>
            College not found.
          </OxText>
        </View>
      )}
    </>
  );
}

function CollegeBody({ college }: { college: string }) {
  const { colors } = useOxTheme();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [sort, setSort] = useState<CollegeReviewSort>("top");
  const overview = useQuery(api.collegeDirectory.getOverview, { college });
  const aggregates = useQuery(api.collegeReviews.getCollegeAggregates, {
    college,
  });
  const reviews = useQuery(api.collegeReviews.listReviewsForCollege, {
    college,
    sort,
    limit: 30,
  });
  const rawListings = useQuery(api.listings.listActiveListingsForCollege, {
    college,
  });
  const toggleWishlist = useMutation(api.users.toggleWishlistCollege);
  const [wishOverride, setWishOverride] = useState<boolean | null>(null);

  // Keep the last list on screen while a new sort loads.
  const [lastReviews, setLastReviews] = useState(reviews);
  if (reviews !== undefined && reviews !== lastReviews) setLastReviews(reviews);
  const reviewsToShow = reviews ?? lastReviews;

  const userId = user?.id;
  const listings = useMemo(() => {
    if (rawListings === undefined) return undefined;
    const now = Date.now();
    return rawListings
      .map(mapListing)
      .filter((l) => Date.parse(l.dateTime) > now)
      .filter((l) => l.ownerUserId !== userId)
      .sort((a, b) => Date.parse(a.dateTime) - Date.parse(b.dateTime));
  }, [rawListings, userId]);

  const wished = wishOverride ?? overview?.onMyWishlist ?? false;
  const averages = aggregates?.averages ?? null;

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.content}
    >
      <SketchCard seed={7} padding={10} tilt={0.001}>
        <View style={styles.hero}>
          <CollegeStamp college={college} size={64} />
          <View style={styles.heroText}>
            <OxText
              accessibilityRole="header"
              style={[styles.name, { color: colors.ink }]}
            >
              {college}
            </OxText>
            <View style={styles.summary}>
              {averages && aggregates ? (
                <View
                  style={styles.rating}
                  accessible
                  accessibilityLabel={`Rated ${averages.overall.toFixed(1)} out of 5 from ${aggregates.reviewCount} reviews`}
                >
                  <Ionicons
                    name="star-outline"
                    size={14}
                    color={colors.inkMuted}
                  />
                  <OxText style={[styles.meta, { color: colors.inkMuted }]}>
                    {averages.overall.toFixed(1)} ({aggregates.reviewCount})
                  </OxText>
                </View>
              ) : null}
              {overview && overview.wantCount > 0 ? (
                <OxText style={[styles.meta, { color: colors.inkMuted }]}>
                  {overview.wantCount} want to go
                </OxText>
              ) : null}
            </View>
          </View>
        </View>
        {isAuthenticated ? (
          <Pressable
            onPress={() => {
              setWishOverride(!wished);
              toggleWishlist({ college })
                .catch((error) =>
                  Alert.alert(
                    "Couldn't update your wishlist",
                    errorMessage(error),
                  ),
                )
                .finally(() => setWishOverride(null));
            }}
            style={[styles.want, { borderColor: colors.ink }]}
            accessibilityRole="button"
            accessibilityState={{ selected: wished }}
            accessibilityLabel="Want to go"
          >
            <Ionicons
              name={wished ? "heart" : "heart-outline"}
              size={18}
              color={wished ? colors.danger : colors.ink}
            />
            <OxText style={[styles.wantText, { color: colors.ink }]}>
              Want to go
            </OxText>
          </Pressable>
        ) : null}
      </SketchCard>

      <Section title="The guide">
        <CollegeGuide college={college} />
      </Section>

      <Section title="Upcoming formals">
        {listings === undefined ? (
          <View style={styles.loading}>
            <OxSpinner />
          </View>
        ) : listings.length === 0 ? (
          <OxText style={[styles.note, { color: colors.inkMuted }]}>
            No open formals.
          </OxText>
        ) : (
          <SketchCard seed={41} padding={6} tilt={0.001}>
            {listings.map((l, i) => (
              <Pressable
                key={l.id}
                onPress={() => router.push(`/listing/${l.id}`)}
                style={[
                  styles.listing,
                  i > 0 && {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: colors.inkSoft,
                  },
                ]}
                accessibilityRole="button"
              >
                <View style={styles.listingText}>
                  <OxText style={[styles.listingDate, { color: colors.ink }]}>
                    {formatListingDate(l.dateTime)}
                  </OxText>
                  <OxText style={[styles.meta, { color: colors.inkMuted }]}>
                    {formatListingSeatsLabel(l.seatsAvailable)} ·{" "}
                    {paymentLabel(l)}
                  </OxText>
                </View>
                <Ionicons
                  name="chevron-forward-outline"
                  size={18}
                  color={colors.inkSoft}
                />
              </Pressable>
            ))}
          </SketchCard>
        )}
      </Section>

      <Section
        title="Reviews"
        aside={
          reviewsToShow && reviewsToShow.length > 1 ? (
            <View style={styles.sorts}>
              {REVIEW_SORTS.map((s) => (
                <Chip
                  key={s.id}
                  label={s.label}
                  selected={sort === s.id}
                  onPress={() => setSort(s.id)}
                />
              ))}
            </View>
          ) : null
        }
      >
        <View style={styles.stack}>
          {averages ? (
            <SketchCard seed={59} padding={10} tilt={0.001}>
              <View style={styles.averages}>
                {COLLEGE_REVIEW_CATEGORIES.map((cat) => (
                  <StarRating
                    key={cat.key}
                    label={cat.label}
                    value={averages[cat.key]}
                    size="sm"
                  />
                ))}
              </View>
            </SketchCard>
          ) : null}
          {reviewsToShow === undefined ? (
            <View style={styles.loading}>
              <OxSpinner />
            </View>
          ) : reviewsToShow.length === 0 ? (
            <OxText style={[styles.note, { color: colors.inkMuted }]}>
              {overview && overview.friendsBeen > 0
                ? `No reviews yet. ${overview.friendsBeen} ${overview.friendsBeen === 1 ? "friend has" : "friends have"} been.`
                : "No reviews yet."}
            </OxText>
          ) : (
            reviewsToShow.map((review) => (
              <CollegeReviewCard key={review.id} review={review} />
            ))
          )}
        </View>
      </Section>

      {overview && overview.memberCount > 0 ? (
        <Section title="Members">
          <View style={styles.members}>
            <View style={styles.memberFaces}>
              {overview.members.slice(0, 6).map((m) => (
                <Pressable
                  key={m._id}
                  onPress={() => router.push(`/profile/${m._id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`${m.name ?? "Member"}'s profile`}
                >
                  <Avatar
                    avatar={m.avatar}
                    name={m.name ?? "Member"}
                    size={36}
                  />
                </Pressable>
              ))}
            </View>
            <OxText style={[styles.meta, { color: colors.inkMuted }]}>
              {overview.memberCount} member
              {overview.memberCount === 1 ? "" : "s"}
            </OxText>
          </View>
        </Section>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: SCREEN_PADDING, paddingBottom: 48, gap: SECTION_GAP },
  missing: {
    flex: 1,
    padding: SCREEN_PADDING,
    paddingTop: 40,
    alignItems: "center",
  },
  hero: { flexDirection: "row", alignItems: "center", gap: 14 },
  heroText: { flex: 1 },
  name: { fontSize: 30, lineHeight: 34 },
  summary: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: 12,
    minHeight: 20,
    marginTop: 2,
  },
  rating: { flexDirection: "row", alignItems: "center", gap: 4 },
  meta: { fontSize: 14 },
  want: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 14,
    minHeight: 40,
    marginTop: 12,
  },
  wantText: { fontSize: 15 },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 22, textTransform: "uppercase" },
  // Chips carry their own bottom margin; cancel it so the row sits on the title's line.
  sorts: { flexDirection: "row", marginBottom: -8, marginRight: -8 },
  stack: { gap: CARD_GAP },
  averages: { gap: 8 },
  loading: { paddingVertical: 24, alignItems: "center" },
  note: { fontSize: 15 },
  listing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 10,
    minHeight: 48,
  },
  listingText: { flex: 1 },
  listingDate: { fontSize: 17 },
  members: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  memberFaces: { flexDirection: "row", gap: 6 },
});
