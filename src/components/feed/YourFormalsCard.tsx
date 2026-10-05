import { useAuth } from "@/src/components/auth/useAuth";
import { useData } from "@/src/components/data/useData";
import { useListingsHubData } from "@/src/components/reviews/useListingsHubData";
import { OxText } from "@/src/components/ui/OxText";
import { SketchCard } from "@/src/components/ui/SketchCard";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { listingIsPast } from "@/lib/data/collegeReviewEligibility";
import { formatShortDate } from "@/src/lib/data/format";
import { useNowMs } from "@/src/lib/hooks/useNowMs";
import { outgoingRequestsForUser } from "@/src/lib/data/requestFilters";
import { Ionicons } from "@expo/vector-icons";
import { type Href, useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

type Row = { key: string; title: string; note?: string; href: Href; urgent?: boolean };
type Group = { label: string; rows: Row[] };

const MAX_ROWS = 3;

/**
 * What you're hosting, what you've asked for, what's waiting on you and what
 * you've hosted, at the top of the feed. Hidden until there is something to show.
 */
export function YourFormalsCard() {
  const { colors } = useOxTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { requests, getListing } = useData();
  const hub = useListingsHubData();
  const nowMs = useNowMs();

  const groups = useMemo<Group[]>(() => {
    if (!user) return [];
    // A full (booked) formal is still one you're hosting until the night has passed.
    const mine = [...hub.myActiveListings, ...hub.myBookedListings];
    const time = (iso: string) => Date.parse(iso);
    const hosting: Row[] = mine
      .filter((l) => !listingIsPast(l.dateTime, nowMs))
      .sort((a, b) => time(a.dateTime) - time(b.dateTime))
      .map((listing) => {
        const pending = hub.pendingCountByListing.get(listing.id) ?? 0;
        const open = listing.status === "active" ? listing.seatsAvailable : 0;
        return {
          key: listing.id,
          title: `${listing.college} · ${formatShortDate(listing.dateTime)}`,
          note:
            pending > 0
              ? `${pending} request${pending === 1 ? "" : "s"} waiting`
              : open > 0
                ? `${open} seat${open === 1 ? "" : "s"} open`
                : "Full",
          href: `/listing/${listing.id}` as Href,
          urgent: pending > 0,
        };
      });
    // Formals you hosted that have been and gone, latest first.
    const hosted: Row[] = mine
      .filter((l) => listingIsPast(l.dateTime, nowMs))
      .sort((a, b) => time(b.dateTime) - time(a.dateTime))
      .map((listing) => ({
        key: `h-${listing.id}`,
        title: `${listing.college} · ${formatShortDate(listing.dateTime)}`,
        href: `/listing/${listing.id}` as Href,
      }));
    const requested: Row[] = outgoingRequestsForUser(requests, user.id)
      .filter((r) => r.status === "pending")
      .flatMap((r) => {
        const listing = getListing(r.targetListingId);
        if (!listing) return [];
        return [
          {
            key: r.id,
            title: `${listing.college} · ${formatShortDate(listing.dateTime)}`,
            note: "Waiting for the host",
            href: `/request/${r.id}` as Href,
          },
        ];
      });
    const followUp: Row[] = [
      ...hub.listingsNeedingAttendance.map(({ listing }) => ({
        key: `a-${listing.id}`,
        title: `${listing.college} · ${formatShortDate(listing.dateTime)}`,
        note: "Did you go?",
        href: `/listing/${listing.id}` as Href,
        urgent: true,
      })),
      ...hub.listingsNeedingReview.map(({ listing }) => ({
        key: `r-${listing.id}`,
        title: `${listing.college} · ${formatShortDate(listing.dateTime)}`,
        note: "Rate this formal",
        href: `/listing/${listing.id}` as Href,
        urgent: true,
      })),
    ];
    return [
      { label: "Hosting", rows: hosting },
      { label: "Requested", rows: requested },
      { label: "Follow up", rows: followUp },
      { label: "Hosted", rows: hosted },
    ].filter((g) => g.rows.length > 0);
  }, [user, hub, requests, getListing, nowMs]);

  if (!user || groups.length === 0) return null;

  return (
    <SketchCard seed={71} padding={14} tilt={0.001}>
      <Pressable
        onPress={() => router.push("/your-formals")}
        style={styles.head}
        accessibilityRole="button"
        accessibilityLabel="Your formals"
      >
        <OxText style={[styles.title, { color: colors.ink }]}>Your formals</OxText>
        <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
      </Pressable>
      {groups.map((group) => (
        <View key={group.label} style={styles.group}>
          <OxText style={[styles.groupLabel, { color: colors.inkSoft }]}>
            {group.label}
          </OxText>
          {group.rows.slice(0, MAX_ROWS).map((row) => (
            <Pressable
              key={row.key}
              onPress={() => router.push(row.href)}
              style={styles.row}
              accessibilityRole="button"
            >
              <OxText numberOfLines={1} style={[styles.rowTitle, { color: colors.ink }]}>
                {row.title}
              </OxText>
              {row.note ? (
                <OxText
                  numberOfLines={1}
                  style={[
                    styles.rowNote,
                    { color: row.urgent ? colors.danger : colors.inkMuted },
                  ]}
                >
                  {row.note}
                </OxText>
              ) : null}
            </Pressable>
          ))}
          {group.rows.length > MAX_ROWS ? (
            <OxText style={[styles.more, { color: colors.inkMuted }]}>
              + {group.rows.length - MAX_ROWS} more
            </OxText>
          ) : null}
        </View>
      ))}
    </SketchCard>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 28,
  },
  title: { fontSize: 20, textTransform: "uppercase" },
  group: { marginTop: 10 },
  groupLabel: { fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 34,
  },
  rowTitle: { fontSize: 16, flexShrink: 1 },
  rowNote: { fontSize: 13 },
  more: { fontSize: 13, marginTop: 2 },
});
