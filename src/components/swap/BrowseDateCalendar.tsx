import { OxMonthCalendar } from "@/src/components/ui/OxMonthCalendar";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { keyFromDate, parseKey } from "@/src/lib/calendar/monthGrid";
import { useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  /** When true, omit outer frame (e.g. inside a modal). */
  embedded?: boolean;
};

export const BROWSE_DATE_CALENDAR_INSTRUCTIONS =
  "Tap days to filter. Long-press another day to select every day in between.";

function enumerateKeysInclusive(a: string, b: string): string[] {
  const da = parseKey(a);
  const db = parseKey(b);
  if (!da || !db) return [];
  const t0 = +da <= +db ? da : db;
  const t1 = +da <= +db ? db : da;
  const out: string[] = [];
  const cur = new Date(t0);
  while (cur <= t1) {
    out.push(keyFromDate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function mergeUniqueSorted(a: string[], b: string[]): string[] {
  return Array.from(new Set([...a, ...b])).sort();
}

export function BrowseDateCalendar({
  value,
  onChange,
  embedded = false,
}: Props) {
  const { colors } = useOxTheme();
  const now = useMemo(() => new Date(), []);
  const [viewStart, setViewStart] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const lastClickRef = useRef<string | null>(null);

  const selected = useMemo(() => new Set(value), [value]);
  const todayKey = keyFromDate(now);

  function handleDayPress(key: string) {
    const next = new Set(value);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(Array.from(next).sort());
    lastClickRef.current = key;
  }

  function handleDayLongPress(key: string) {
    if (lastClickRef.current && lastClickRef.current !== key) {
      const span = enumerateKeysInclusive(lastClickRef.current, key);
      onChange(mergeUniqueSorted(value, span));
    }
    lastClickRef.current = key;
  }

  const hasSelection = value.length > 0;

  return (
    <View
      style={
        embedded
          ? styles.shellEmbedded
          : [
              styles.shell,
              {
                borderColor: colors.ink,
                backgroundColor: colors.paper,
              },
            ]
      }
    >
      {!embedded ? (
        <Text style={[styles.instructions, { color: colors.inkMuted }]}>
          {BROWSE_DATE_CALENDAR_INSTRUCTIONS}
        </Text>
      ) : null}

      <OxMonthCalendar
        viewStart={viewStart}
        onViewStartChange={setViewStart}
        selectedKeys={selected}
        todayKey={todayKey}
        onDayPress={handleDayPress}
        onDayLongPress={handleDayLongPress}
      />

      {hasSelection ? (
        <View style={embedded ? styles.clearWrapEmbedded : styles.clearWrap}>
          <Pressable
            onPress={() => onChange([])}
            style={({ pressed }) => [
              styles.clearBtn,
              {
                borderColor: colors.ink,
                backgroundColor: colors.paper,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text style={{ color: colors.ink, fontSize: embedded ? 12 : 14 }}>
              Clear dates ({value.length})
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: "100%",
    maxWidth: 400,
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  shellEmbedded: {
    width: "100%",
  },
  instructions: {
    fontFamily: FONT_DISPLAY,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
  },
  clearWrap: {
    marginTop: 8,
    alignItems: "center",
  },
  clearWrapEmbedded: {
    marginTop: 8,
    alignItems: "center",
  },
  clearBtn: {
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
});
