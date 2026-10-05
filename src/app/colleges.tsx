import { api } from "@/convex/_generated/api";
import { collegeToSlug } from "@/lib/data/collegeSlug";
import { useAuth } from "@/src/components/auth/useAuth";
import { CollegeStamp } from "@/src/components/colleges/CollegeStamp";
import { Chip } from "@/src/components/ui/Chip";
import { OxInput } from "@/src/components/ui/OxInput";
import { OxLoadingView } from "@/src/components/ui/OxLoadingView";
import { OxText } from "@/src/components/ui/OxText";
import { SketchCard } from "@/src/components/ui/SketchCard";
import { CARD_GAP, SCREEN_PADDING } from "@/src/constants/layout";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { formatShortDate } from "@/src/lib/data/format";
import { errorMessage } from "@/src/lib/errorMessage";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { type Href, Stack, useRouter } from "expo-router";
import { memo, useMemo, useState } from "react";
import { Alert, Pressable, SectionList, StyleSheet, View } from "react-native";

type Sort = "soon" | "wanted" | "rated";
type Entry = FunctionReturnType<
  typeof api.collegeDirectory.listDirectory
>[number];

const SORTS: { id: Sort; label: string }[] = [
  { id: "soon", label: "Formals soon" },
  { id: "wanted", label: "Most wanted" },
  { id: "rated", label: "Top rated" },
];

function seedFrom(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

/** What's coming up at a college, if anything. */
function formalsLine(e: Entry): { text: string; hot: boolean } | null {
  if (e.weekCount > 0) {
    return {
      text: `${e.weekCount} formal${e.weekCount === 1 ? "" : "s"} this week`,
      hot: true,
    };
  }
  if (e.nextAt)
    return { text: `Next formal ${formatShortDate(e.nextAt)}`, hot: false };
  return null;
}

function sortEntries(entries: Entry[], sort: Sort): Entry[] {
  const byName = (a: Entry, b: Entry) => a.college.localeCompare(b.college);
  const copy = [...entries];
  if (sort === "soon") {
    // Soonest formal first; colleges with nothing coming up go last, A to Z.
    // ISO strings compare with <, not localeCompare (its collation differs).
    copy.sort((a, b) => {
      if (a.nextAt && b.nextAt) {
        if (a.nextAt !== b.nextAt) return a.nextAt < b.nextAt ? -1 : 1;
        return b.wantCount - a.wantCount || byName(a, b);
      }
      if (a.nextAt) return -1;
      if (b.nextAt) return 1;
      return byName(a, b);
    });
  }
  if (sort === "wanted")
    copy.sort((a, b) => b.wantCount - a.wantCount || byName(a, b));
  if (sort === "rated") {
    copy.sort(
      (a, b) =>
        (b.rating ?? -1) - (a.rating ?? -1) ||
        b.reviewCount - a.reviewCount ||
        byName(a, b),
    );
  }
  return copy;
}

const CollegeRow = memo(function CollegeRow({ entry }: { entry: Entry }) {
  const { colors } = useOxTheme();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const toggle = useMutation(api.users.toggleWishlistCollege);
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const wished = optimistic ?? entry.onMyWishlist;
  const formals = formalsLine(entry);

  return (
    <SketchCard seed={seedFrom(entry.college)} padding={8} tilt={0.001}>
      <View style={styles.row}>
        <Pressable
          style={styles.rowMain}
          onPress={() =>
            router.push(`/college/${collegeToSlug(entry.college)}` as Href)
          }
          accessibilityRole="button"
          accessibilityLabel={entry.college}
        >
          <CollegeStamp college={entry.college} />
          <View style={styles.rowText}>
            <OxText
              numberOfLines={1}
              style={[styles.name, { color: colors.ink }]}
            >
              {entry.college}
            </OxText>
            <View style={styles.stats}>
              {formals ? (
                formals.hot ? (
                  <View
                    style={[styles.hotTag, { backgroundColor: colors.accent }]}
                  >
                    <OxText
                      style={[styles.hotText, { color: colors.accentInk }]}
                    >
                      {formals.text}
                    </OxText>
                  </View>
                ) : (
                  <OxText style={[styles.stat, { color: colors.inkMuted }]}>
                    {formals.text}
                  </OxText>
                )
              ) : null}
              {entry.rating !== null ? (
                <View style={styles.rating}>
                  <Ionicons
                    name="star-outline"
                    size={13}
                    color={colors.inkMuted}
                  />
                  <OxText style={[styles.stat, { color: colors.inkMuted }]}>
                    {entry.rating.toFixed(1)} · {entry.reviewCount} review
                    {entry.reviewCount === 1 ? "" : "s"}
                  </OxText>
                </View>
              ) : null}
              {!formals && entry.rating === null ? (
                <OxText style={[styles.stat, { color: colors.inkMuted }]}>
                  {entry.wantCount > 0
                    ? `${entry.wantCount} want to go`
                    : "No formals yet"}
                </OxText>
              ) : null}
            </View>
          </View>
        </Pressable>
        {isAuthenticated ? (
          <Pressable
            onPress={() => {
              setOptimistic(!wished);
              toggle({ college: entry.college })
                .catch((error) =>
                  Alert.alert(
                    "Couldn't update your wishlist",
                    errorMessage(error),
                  ),
                )
                .finally(() => setOptimistic(null));
            }}
            hitSlop={8}
            style={styles.heart}
            accessibilityRole="button"
            accessibilityState={{ selected: wished }}
            accessibilityLabel={
              wished
                ? `Remove ${entry.college} from Want to go`
                : `Want to go to ${entry.college}`
            }
          >
            <Ionicons
              name={wished ? "star" : "star-outline"}
              size={22}
              color={wished ? colors.danger : colors.inkMuted}
            />
          </Pressable>
        ) : null}
      </View>
    </SketchCard>
  );
});

/** Every college: what's on soon, how it's rated, and who wants to go. */
export default function CollegesScreen() {
  const { colors } = useOxTheme();
  const entries = useQuery(api.collegeDirectory.listDirectory, {});
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("soon");

  const trimmed = query.trim().toLowerCase();
  const sections = useMemo(() => {
    if (!entries) return undefined;
    const matching = trimmed
      ? entries.filter((e) => e.college.toLowerCase().includes(trimmed))
      : entries;
    const shown = sortEntries(matching, sort);
    // Under "Formals soon", colleges with nothing listed sit under their own label.
    const upcoming = sort === "soon" ? shown.filter((e) => e.nextAt) : shown;
    const rest = sort === "soon" ? shown.filter((e) => !e.nextAt) : [];
    return [
      { title: null, data: upcoming },
      { title: upcoming.length > 0 ? "Nothing listed yet" : null, data: rest },
    ].filter((s) => s.data.length > 0);
  }, [entries, trimmed, sort]);

  return (
    <>
      <Stack.Screen options={{ title: "Colleges", headerShown: true }} />
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <OxInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search colleges"
          accessibilityLabel="Search colleges"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
          seed={31}
        />
        <View style={styles.sorts}>
          {SORTS.map((s) => (
            <Chip
              key={s.id}
              label={s.label}
              selected={sort === s.id}
              onPress={() => setSort(s.id)}
            />
          ))}
        </View>
        {sections === undefined ? (
          <OxLoadingView fill />
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(e) => e.college}
            keyboardShouldPersistTaps="handled"
            stickySectionHeadersEnabled={false}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={styles.gap} />}
            renderSectionHeader={({ section }) =>
              section.title ? (
                <OxText
                  style={[styles.sectionLabel, { color: colors.inkSoft }]}
                >
                  {section.title}
                </OxText>
              ) : null
            }
            renderItem={({ item }) => <CollegeRow entry={item} />}
            ListEmptyComponent={
              <OxText style={[styles.empty, { color: colors.inkMuted }]}>
                No colleges match.
              </OxText>
            }
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: SCREEN_PADDING, paddingTop: 12 },
  sorts: { flexDirection: "row", flexWrap: "wrap", marginTop: 12 },
  list: { paddingTop: 4, paddingBottom: 40 },
  gap: { height: CARD_GAP },
  sectionLabel: {
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 10,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  rowText: { flex: 1 },
  name: { fontSize: 20, lineHeight: 24 },
  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: 10,
    rowGap: 2,
    marginTop: 2,
  },
  stat: { fontSize: 13 },
  rating: { flexDirection: "row", alignItems: "center", gap: 3 },
  hotTag: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  hotText: { fontSize: 12 },
  heart: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { textAlign: "center", marginTop: 40, fontSize: 15 },
});
