import { FONT_DISPLAY } from "@/src/constants/fonts";
import type { OxColors } from "@/src/constants/oxTheme";
import { space } from "@/src/constants/spacing";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import {
  buildMonthCells,
  chunkWeeks,
  keyFromDate,
  monthTitle,
  WEEK_LABELS,
  type MonthCell,
} from "@/src/lib/calendar/monthGrid";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  viewStart: Date;
  onViewStartChange: (next: Date) => void;
  selectedKeys: Set<string>;
  onDayPress: (key: string) => void;
  onDayLongPress?: (key: string) => void;
  todayKey?: string;
};

export function OxMonthCalendar({
  viewStart,
  onViewStartChange,
  selectedKeys,
  onDayPress,
  onDayLongPress,
  todayKey = keyFromDate(new Date()),
}: Props) {
  const { colors } = useOxTheme();

  const viewYear = viewStart.getFullYear();
  const viewMonth = viewStart.getMonth();

  const weeks = useMemo(() => {
    const cells = buildMonthCells(viewYear, viewMonth);
    return chunkWeeks(cells);
  }, [viewYear, viewMonth]);

  function goPrevMonth() {
    onViewStartChange(
      new Date(viewStart.getFullYear(), viewStart.getMonth() - 1, 1),
    );
  }

  function goNextMonth() {
    onViewStartChange(
      new Date(viewStart.getFullYear(), viewStart.getMonth() + 1, 1),
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.navRow}>
        <Pressable
          onPress={goPrevMonth}
          accessibilityLabel="Previous month"
          style={({ pressed }) => [
            styles.navBtn,
            {
              borderColor: colors.ink,
              backgroundColor: colors.paper,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text style={[styles.navArrow, { color: colors.ink }]}>‹</Text>
        </Pressable>
        <Text
          style={[
            styles.monthTitle,
            { color: colors.ink, fontFamily: FONT_DISPLAY },
          ]}
        >
          {monthTitle(viewYear, viewMonth).toUpperCase()}
        </Text>
        <Pressable
          onPress={goNextMonth}
          accessibilityLabel="Next month"
          style={({ pressed }) => [
            styles.navBtn,
            {
              borderColor: colors.ink,
              backgroundColor: colors.paper,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text style={[styles.navArrow, { color: colors.ink }]}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekHeaderRow}>
        {WEEK_LABELS.map((w) => (
          <View key={w} style={styles.weekCell}>
            <Text
              style={[
                styles.weekLabel,
                { color: colors.inkSoft, fontFamily: FONT_DISPLAY },
              ]}
            >
              {w}
            </Text>
          </View>
        ))}
      </View>

      {weeks.map((week, rowIndex) => (
        <View key={`week-${rowIndex}`} style={styles.weekRow}>
          {week.map((cell, colIndex) => (
            <DayCell
              key={cell.key ?? `empty-${rowIndex}-${colIndex}`}
              cell={cell}
              selectedKeys={selectedKeys}
              todayKey={todayKey}
              colors={colors}
              onDayPress={onDayPress}
              onDayLongPress={onDayLongPress}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

type DayCellProps = {
  cell: MonthCell;
  selectedKeys: Set<string>;
  todayKey: string;
  colors: OxColors;
  onDayPress: (key: string) => void;
  onDayLongPress?: (key: string) => void;
};

function DayCell({
  cell,
  selectedKeys,
  todayKey,
  colors,
  onDayPress,
  onDayLongPress,
}: DayCellProps) {
  if (cell.key == null || cell.day == null) {
    return <View style={styles.dayCell} />;
  }

  const isSel = selectedKeys.has(cell.key);
  const isToday = cell.key === todayKey;

  return (
    <View style={styles.dayCell}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: isSel }}
        accessibilityLabel={`${cell.day}${isSel ? ", selected" : ""}${isToday ? ", today" : ""}`}
        onPress={() => onDayPress(cell.key!)}
        onLongPress={
          onDayLongPress ? () => onDayLongPress(cell.key!) : undefined
        }
        style={({ pressed }) => [
          styles.dayBtn,
          {
            borderColor: isSel ? colors.accent : `${colors.ink}55`,
            backgroundColor: isSel ? colors.accent : colors.paper,
            opacity: pressed ? 0.85 : 1,
          },
          isToday && !isSel
            ? { borderWidth: 2, borderColor: colors.ink }
            : undefined,
        ]}
      >
        <Text
          style={{
            color: isSel ? colors.accentInk : colors.ink,
            fontSize: 15,
            fontFamily: FONT_DISPLAY,
          }}
        >
          {cell.day}
        </Text>
      </Pressable>
    </View>
  );
}

const CELL_GAP = 3;

const styles = StyleSheet.create({
  root: {
    gap: space[1],
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space[2],
  },
  navBtn: {
    width: 36,
    height: 36,
    borderWidth: 2,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  navArrow: {
    fontSize: 20,
    lineHeight: 22,
  },
  monthTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  weekHeaderRow: {
    flexDirection: "row",
    gap: CELL_GAP,
    marginTop: space[1],
  },
  weekRow: {
    flexDirection: "row",
    gap: CELL_GAP,
  },
  weekCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    minHeight: 18,
    paddingBottom: 2,
  },
  weekLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
  },
  dayBtn: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
