import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  COLLEGE_BADGES,
  MILESTONE_BADGES,
  SPECIAL_BADGES,
  badgeById,
  badgeTally,
  type BadgeDefinition,
  type BadgeMetric,
} from "@/lib/data/badges";
import { BadgeMedal } from "@/src/components/profile/BadgeMedal";
import { OxModal } from "@/src/components/ui/OxModal";
import { OxSpinner } from "@/src/components/ui/OxSpinner";
import { OxText } from "@/src/components/ui/OxText";
import { space } from "@/src/constants/spacing";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { OXFORD_TIME_ZONE } from "@/src/lib/time/oxfordTime";
import { useQuery } from "convex/react";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

const METRICS: Record<BadgeMetric, { title: string; unit: string }> = {
  formals: { title: "Formals", unit: "formal" },
  reviews: { title: "Reviews", unit: "review" },
};

type Progress = { formals: number; reviews: number };

function earnedDate(ts: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: OXFORD_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(ts));
}

/** What's left to earn a badge, and how far along a ladder step is. */
function remaining(
  def: BadgeDefinition,
  progress: Progress | undefined,
): { text: string; ratio: number | null } {
  if (def.family === "college") {
    return { text: `Attend a formal at ${def.college}`, ratio: null };
  }
  if (def.family !== "milestone" || !progress) {
    return { text: def.description, ratio: null };
  }
  const have = progress[def.metric];
  const left = Math.max(0, def.threshold - have);
  const unit = METRICS[def.metric].unit;
  return {
    text: `${left} more ${unit}${left === 1 ? "" : "s"}`,
    ratio: Math.min(1, have / def.threshold),
  };
}

function Tile({
  def,
  earned,
  width,
  onPress,
}: {
  def: BadgeDefinition;
  earned: boolean;
  width: `${number}%`;
  onPress: () => void;
}) {
  const { colors } = useOxTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tile, { width }]}
      accessibilityRole="button"
      accessibilityLabel={`${def.name}, ${earned ? "earned" : "not earned"}`}
    >
      <BadgeMedal def={def} earned={earned} />
      <OxText
        numberOfLines={2}
        style={[styles.tileName, { color: earned ? colors.ink : colors.inkSoft }]}
      >
        {def.name}
      </OxText>
    </Pressable>
  );
}

/** The full badge case: the two ladders, then every college's stamp. */
export function BadgeCase({ userId }: { userId: Id<"users"> }) {
  const { colors } = useOxTheme();
  const rows = useQuery(api.badges.getUserBadges, { userId });
  const progress = useQuery(api.badges.getBadgeProgress, { userId });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  if (!rows) {
    return (
      <View style={styles.loading}>
        <OxSpinner />
      </View>
    );
  }

  const earnedAt = new Map(rows.map((row) => [row.badgeId, row.earnedAt]));
  const tally = badgeTally(rows);
  // Special badges are only shown to the people who hold them.
  const specials = SPECIAL_BADGES.filter((badge) => earnedAt.has(badge.id));
  const collegesEarned = COLLEGE_BADGES.filter((badge) => earnedAt.has(badge.id)).length;
  const selected = selectedId ? badgeById(selectedId) : undefined;
  const selectedEarnedAt = selected ? earnedAt.get(selected.id) : undefined;
  const todo = selected ? remaining(selected, progress) : null;

  const open = (id: string) => {
    setSelectedId(id);
    setDetailOpen(true);
  };

  const heading = (label: string, note?: string | number) => (
    <View style={styles.head}>
      <OxText style={[styles.title, { color: colors.ink }]}>{label}</OxText>
      {note !== undefined ? (
        <OxText style={[styles.note, { color: colors.inkMuted }]}>{note}</OxText>
      ) : null}
    </View>
  );

  const ladder = (metric: BadgeMetric) => {
    const steps = MILESTONE_BADGES.filter((badge) => badge.metric === metric);
    return (
      <View>
        {heading(METRICS[metric].title, progress?.[metric])}
        <View style={styles.ladder}>
          <View
            style={[
              styles.rail,
              { backgroundColor: colors.inkSoft, width: `${(steps.length - 1) * 25}%` },
            ]}
          />
          {steps.map((def) => (
            <Tile
              key={def.id}
              def={def}
              earned={earnedAt.has(def.id)}
              width="25%"
              onPress={() => open(def.id)}
            />
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.wrap}>
      <OxText style={[styles.note, { color: colors.inkMuted }]}>
        {tally.earned} of {tally.total}
      </OxText>

      {specials.length > 0 ? (
        <View style={styles.grid}>
          {specials.map((def) => (
            <Tile key={def.id} def={def} earned width="25%" onPress={() => open(def.id)} />
          ))}
        </View>
      ) : null}

      {ladder("formals")}
      {ladder("reviews")}

      <View>
        {heading("Colleges", `${collegesEarned} of ${COLLEGE_BADGES.length}`)}
        <View style={styles.grid}>
          {COLLEGE_BADGES.map((def) => (
            <Tile
              key={def.id}
              def={def}
              earned={earnedAt.has(def.id)}
              width="25%"
              onPress={() => open(def.id)}
            />
          ))}
        </View>
      </View>

      <OxModal
        visible={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={selected?.name}
        scrollable={false}
      >
        {selected && todo ? (
          <View style={styles.detail}>
            <BadgeMedal def={selected} earned={selectedEarnedAt !== undefined} size={64} />
            <View style={styles.detailText}>
              <OxText style={[styles.status, { color: colors.ink }]}>
                {selectedEarnedAt !== undefined
                  ? `Earned ${earnedDate(selectedEarnedAt)}`
                  : todo.text}
              </OxText>
              {selectedEarnedAt === undefined && todo.ratio !== null ? (
                <View style={[styles.bar, { borderColor: colors.ink }]}>
                  <View
                    style={[
                      styles.barFill,
                      { backgroundColor: colors.accent, width: `${Math.round(todo.ratio * 100)}%` },
                    ]}
                  />
                </View>
              ) : null}
            </View>
          </View>
        ) : null}
      </OxModal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[5] },
  loading: { alignItems: "center", paddingVertical: space[6] },
  head: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: space[2],
  },
  title: { fontSize: 20, textTransform: "uppercase" },
  note: { fontSize: 14 },
  ladder: { flexDirection: "row" },
  // Runs behind the medals, through their centres.
  rail: { position: "absolute", left: "12.5%", top: 24, height: 2, opacity: 0.5 },
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: space[3] },
  tile: { alignItems: "center", paddingHorizontal: 2 },
  tileName: { fontSize: 11, lineHeight: 13, textAlign: "center", marginTop: 4 },
  detail: { flexDirection: "row", alignItems: "center", gap: space[4], paddingBottom: space[2] },
  detailText: { flex: 1, gap: space[2] },
  status: { fontSize: 17, lineHeight: 22 },
  bar: { height: 12, borderWidth: 1.5, borderRadius: 6, overflow: "hidden" },
  barFill: { height: "100%" },
});
