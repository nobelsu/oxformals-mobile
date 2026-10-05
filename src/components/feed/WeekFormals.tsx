import { api } from "@/convex/_generated/api";
import { collegeToSlug } from "@/lib/data/collegeSlug";
import { CollegeStamp } from "@/src/components/colleges/CollegeStamp";
import { OxText } from "@/src/components/ui/OxText";
import { SCREEN_PADDING } from "@/src/constants/layout";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { useNowMs } from "@/src/lib/hooks/useNowMs";
import type { FunctionReturnType } from "convex/server";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

type Bubble = FunctionReturnType<typeof api.feed.getWeekFormals>[number];

const STAMP = 54;

const londonDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const shortDay = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  weekday: "short",
  day: "numeric",
});

function dayLabel(iso: string, nowMs: number): string {
  const day = londonDay.format(new Date(iso));
  if (day === londonDay.format(new Date(nowMs))) return "Tonight";
  if (day === londonDay.format(new Date(nowMs + 864e5))) return "Tomorrow";
  return shortDay.format(new Date(iso));
}

/**
 * Open formals this week as college bubbles, grouped by night. Wishlist
 * colleges get an accent ring. Hidden when nothing's on.
 */
export function WeekFormals() {
  const { colors } = useOxTheme();
  const router = useRouter();
  const nowMs = useNowMs();
  const bubbles = useQuery(api.feed.getWeekFormals, {});

  if (!bubbles || bubbles.length === 0) return null;

  const days: { label: string; items: Bubble[] }[] = [];
  for (const b of bubbles) {
    const label = dayLabel(b.dateTime, nowMs);
    const last = days[days.length - 1];
    if (last && last.label === label) last.items.push(b);
    else days.push({ label, items: [b] });
  }

  const open = (b: Bubble) =>
    router.push(
      b.listingIds.length === 1
        ? `/listing/${b.listingIds[0]}`
        : `/college/${collegeToSlug(b.college)}`,
    );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroller}
      contentContainerStyle={styles.content}
    >
      {days.map((day, i) => (
        <View
          key={day.label}
          style={[styles.day, i > 0 && [styles.divided, { borderLeftColor: colors.inkSoft }]]}
        >
          <OxText
            style={[
              styles.dayLabel,
              { color: day.label === "Tonight" ? colors.ink : colors.inkMuted },
            ]}
          >
            {day.label}
          </OxText>
          <View style={styles.bubbles}>
            {day.items.map((b) => (
              <Pressable
                key={b.key}
                onPress={() => open(b)}
                style={styles.bubble}
                accessibilityRole="button"
                accessibilityLabel={`${b.college}, ${day.label}${
                  b.onWishlist ? ", on your wishlist" : ""
                }`}
              >
                <View
                  style={[
                    styles.ring,
                    { borderColor: b.onWishlist ? colors.accent : "transparent" },
                  ]}
                >
                  <CollegeStamp college={b.college} size={STAMP} />
                </View>
                <OxText
                  numberOfLines={1}
                  style={[styles.name, { color: colors.inkMuted }]}
                >
                  {b.college}
                </OxText>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Bleeds to the screen edges so bubbles scroll under the page margin.
  scroller: { marginHorizontal: -SCREEN_PADDING },
  content: { paddingHorizontal: SCREEN_PADDING, gap: 16 },
  day: { gap: 6 },
  divided: { borderLeftWidth: 1.5, paddingLeft: 16 },
  dayLabel: { fontSize: 13 },
  bubbles: { flexDirection: "row", gap: 10 },
  bubble: { width: STAMP + 12, alignItems: "center", gap: 4 },
  ring: { borderWidth: 2.5, borderRadius: 999, padding: 2 },
  name: { fontSize: 12, width: "100%", textAlign: "center" },
});
