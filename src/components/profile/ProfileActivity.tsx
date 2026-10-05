import { api } from "@/convex/_generated/api";
import { collegeToSlug } from "@/lib/data/collegeSlug";
import { OxSpinner } from "@/src/components/ui/OxSpinner";
import { OxText } from "@/src/components/ui/OxText";
import { SketchCard } from "@/src/components/ui/SketchCard";
import { CARD_GAP } from "@/src/constants/layout";
import { space } from "@/src/constants/spacing";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import {
  formatListingTime,
  formatPrice,
  formatShortDate,
  isoToLocalDateKey,
} from "@/src/lib/data/format";
import { Ionicons } from "@expo/vector-icons";
import type { FunctionReturnType } from "convex/server";
import { useRouter, type Href } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

export type ProfileActivityData = FunctionReturnType<
  typeof api.profileActivity.getProfileActivity
>;
type Item = Exclude<ProfileActivityData["items"][number], { kind: "listing" }>;
type DayGroup = { key: string; day: string; items: Item[] };

/** A formal is dated by its night; a review by when it was written. */
function itemIso(item: Item): string {
  return item.kind === "attended" ? item.dateTime : new Date(item.ts).toISOString();
}

/** The newest-first stream in Oxford-day buckets, order kept. */
function groupByDay(items: Item[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const item of items) {
    const iso = itemIso(item);
    const key = isoToLocalDateKey(iso);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(item);
    else groups.push({ key, day: formatShortDate(iso), items: [item] });
  }
  return groups;
}

function seedFrom(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

type Props = {
  /** undefined while loading. */
  activity: ProfileActivityData | undefined;
};

/** Formals attended and reviews, newest first under day headings. */
export function ProfileActivity({ activity }: Props) {
  const { colors } = useOxTheme();
  const router = useRouter();

  if (!activity) {
    return (
      <View style={styles.empty}>
        <OxSpinner />
      </View>
    );
  }

  const items = activity.items.filter((item): item is Item => item.kind !== "listing");

  if (activity.hidden || items.length === 0) {
    return (
      <View style={styles.empty}>
        {activity.hidden ? (
          <Ionicons name="lock-closed-outline" size={18} color={colors.inkMuted} />
        ) : null}
        <OxText style={[styles.emptyText, { color: colors.inkMuted }]}>
          {activity.hidden ? "This account is private." : "No activity yet"}
        </OxText>
      </View>
    );
  }

  return (
    <View style={styles.days}>
      {groupByDay(items).map((group) => (
        <View key={group.key} style={styles.day}>
          <OxText style={[styles.dayLabel, { color: colors.inkMuted }]}>{group.day}</OxText>
          {group.items.map((item) => {
            const key = `${item.kind}-${item.ts}-${item.college}`;
            const overall = item.kind === "review" ? Math.round(item.ratings.overall) : 0;
            return (
              <Pressable
                key={key}
                onPress={() =>
                  router.push(`/college/${collegeToSlug(item.college)}` as Href)
                }
                accessibilityRole="button"
              >
                <SketchCard seed={seedFrom(key)} padding={10} tilt={0.001}>
                  <OxText style={[styles.kind, { color: colors.inkMuted }]}>
                    {item.kind === "attended"
                      ? item.hosted
                        ? "Hosted"
                        : "Attended"
                      : "Reviewed"}
                  </OxText>
                  <View style={styles.titleRow}>
                    <OxText style={[styles.college, { color: colors.ink }]}>
                      {item.college}
                    </OxText>
                    {item.kind === "attended" ? (
                      <OxText style={[styles.meta, { color: colors.inkMuted }]}>
                        {formatListingTime(item.dateTime)}
                        {!item.hosted && item.price !== undefined
                          ? ` · ${formatPrice(item.price)}`
                          : ""}
                      </OxText>
                    ) : (
                      <View
                        style={styles.stars}
                        accessible
                        accessibilityLabel={`${overall} out of 5`}
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Ionicons
                            key={n}
                            name={n <= overall ? "star" : "star-outline"}
                            size={15}
                            color={colors.ink}
                          />
                        ))}
                      </View>
                    )}
                  </View>
                  {item.kind === "review" && item.comment ? (
                    <OxText numberOfLines={2} style={[styles.comment, { color: colors.inkMuted }]}>
                      {item.comment}
                    </OxText>
                  ) : null}
                </SketchCard>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space[2],
    paddingVertical: space[6],
  },
  emptyText: { fontSize: 16 },
  days: { gap: space[5] },
  day: { gap: CARD_GAP },
  dayLabel: { fontSize: 17 },
  kind: { fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6 },
  titleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: space[2],
    marginTop: 2,
  },
  college: { fontSize: 20, lineHeight: 24 },
  meta: { fontSize: 15 },
  stars: { flexDirection: "row", gap: 2 },
  comment: { fontSize: 15, lineHeight: 20, marginTop: 4 },
});
