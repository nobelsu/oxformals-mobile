import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  badgeById,
  badgeTally,
  medalTone,
  stampLabel,
  type BadgeIconId,
  type MedalTone,
} from "@/lib/data/badges";
import { OxText } from "@/src/components/ui/OxText";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { StyleSheet, View } from "react-native";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const ICONS: Record<BadgeIconId, IconName> = {
  glass: "wine-outline",
  cap: "school-outline",
  candle: "flame-outline",
  crown: "diamond-outline",
  star: "star-outline",
  pen: "create-outline",
  trophy: "trophy-outline",
  college: "shield-outline",
  canape: "restaurant-outline",
};

/** The medal's metal, as on the website: bronze, silver, gold, ruby; specials are ink. */
const TONES: Record<Exclude<MedalTone, "ink">, string> = {
  bronze: "#b87a4b",
  silver: "#a7adb4",
  gold: "#d2a73c",
  ruby: "#b8423e",
};

/** Earned badges as a row of medals, with "3 of 51". Hidden while empty. */
export function BadgeRow({ userId }: { userId: string }) {
  const { colors } = useOxTheme();
  const rows = useQuery(api.badges.getUserBadges, { userId: userId as Id<"users"> });
  if (!rows || rows.length === 0) return null;
  const { earned, total } = badgeTally(rows);

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <OxText style={[styles.title, { color: colors.ink, fontFamily: FONT_DISPLAY }]}>
          Badges
        </OxText>
        <OxText style={[styles.tally, { color: colors.inkMuted }]}>
          {earned} of {total}
        </OxText>
      </View>
      <View style={styles.badges}>
        {rows.map((row) => {
          const def = badgeById(row.badgeId);
          if (!def) return null;
          const tone = medalTone(def);
          const ring = tone === "ink" ? colors.ink : TONES[tone];
          return (
            <View key={row._id} style={styles.badge} accessible accessibilityLabel={def.name}>
              <View style={[styles.medal, { borderColor: ring, backgroundColor: colors.paper }]}>
                {def.family === "college" ? (
                  <OxText style={[styles.stamp, { color: colors.ink }]}>
                    {stampLabel(def.name)}
                  </OxText>
                ) : (
                  <Ionicons name={ICONS[def.icon]} size={22} color={ring} />
                )}
              </View>
              <OxText numberOfLines={2} style={[styles.name, { color: colors.inkMuted }]}>
                {def.name}
              </OxText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 20 },
  head: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  title: { fontSize: 20, textTransform: "uppercase" },
  tally: { fontSize: 14 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 10 },
  badge: { width: 64, alignItems: "center" },
  medal: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
  },
  stamp: { fontSize: 12 },
  name: { fontSize: 11, lineHeight: 13, textAlign: "center", marginTop: 4 },
});
