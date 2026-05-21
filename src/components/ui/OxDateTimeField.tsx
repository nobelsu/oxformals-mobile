import { Chip } from "@/src/components/ui/Chip";
import { DoodleCloseButton } from "@/src/components/ui/DoodleCloseButton";
import { DoodleOutline } from "@/src/components/ui/DoodleOutline";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxMonthCalendar } from "@/src/components/ui/OxMonthCalendar";
import { OxText } from "@/src/components/ui/OxText";
import { space, TAP_MIN } from "@/src/constants/spacing";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { formatListingDate } from "@/src/lib/data/format";
import { keyFromDate, parseKey } from "@/src/lib/calendar/monthGrid";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const TIME_SLOTS: { hours: number; minutes: number }[] = [];
for (let h = 12; h < 24; h++) {
  TIME_SLOTS.push({ hours: h, minutes: 0 }, { hours: h, minutes: 30 });
}

function formatTimeSlot(hours: number, minutes: number): string {
  const d = new Date(2000, 0, 1, hours, minutes);
  return new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: minutes === 0 ? undefined : "2-digit",
  }).format(d);
}

function applyDatePart(base: Date, key: string): Date {
  const parsed = parseKey(key);
  if (!parsed) return base;
  const next = new Date(base);
  next.setFullYear(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  return next;
}

function applyTimePart(base: Date, hours: number, minutes: number): Date {
  const next = new Date(base);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

function defaultFormalDateTime(): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

type Props = {
  value: Date;
  onChange: (next: Date) => void;
};

export function defaultListFormalDateTime(): Date {
  return defaultFormalDateTime();
}

export function OxDateTimeField({ value, onChange }: Props) {
  const { colors } = useOxTheme();
  const [open, setOpen] = useState(false);
  const [viewStart, setViewStart] = useState(
    () => new Date(value.getFullYear(), value.getMonth(), 1),
  );

  const selectedKeys = useMemo(
    () => new Set([keyFromDate(value)]),
    [value],
  );
  const todayKey = keyFromDate(new Date());

  const display = formatListingDate(value.toISOString());
  const selectedTime = value.getHours() * 60 + value.getMinutes();

  function closePicker() {
    setOpen(false);
  }

  return (
    <View>
      <OxText style={[styles.label, { color: colors.inkMuted }]}>
        Date & time
      </OxText>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={
          open
            ? `Date and time, ${display}. Collapse picker`
            : `Date and time, ${display}. Expand picker`
        }
        onPress={() => setOpen((v) => !v)}
      >
        <DoodleOutline
          seed={17}
          fill={colors.paper}
          stroke={colors.ink}
          dashed={!open}
          focused={open}
          contentStyle={styles.triggerInner}
        >
          <Text
            style={[
              styles.triggerText,
              { color: colors.ink, fontFamily: FONT_DISPLAY },
            ]}
          >
            {display}
          </Text>
          <Ionicons
            name={open ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.inkMuted}
          />
        </DoodleOutline>
      </Pressable>

      {open ? (
        <View
          style={[
            styles.panel,
            { borderColor: colors.ink, backgroundColor: colors.bg },
          ]}
        >
          <View style={styles.panelHeader}>
            <OxText style={[styles.panelHint, { color: colors.inkMuted }]}>
              Pick a date and time
            </OxText>
            <DoodleCloseButton
              onPress={closePicker}
              accessibilityLabel="Close date and time picker"
              seed={15}
              size={32}
            />
          </View>

          <OxMonthCalendar
            viewStart={viewStart}
            onViewStartChange={setViewStart}
            selectedKeys={selectedKeys}
            todayKey={todayKey}
            onDayPress={(key) => onChange(applyDatePart(value, key))}
          />

          <OxText style={[styles.timeLabel, { color: colors.inkMuted }]}>
            Time
          </OxText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.timeRow}
          >
            {TIME_SLOTS.map(({ hours, minutes }) => {
              const slotMins = hours * 60 + minutes;
              const label = formatTimeSlot(hours, minutes);
              return (
                <Chip
                  key={label}
                  label={label}
                  selected={selectedTime === slotMins}
                  onPress={() => onChange(applyTimePart(value, hours, minutes))}
                />
              );
            })}
          </ScrollView>

          <OxButton title="Done" onPress={closePicker} seed={71} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: space[2],
    fontSize: 14,
  },
  triggerInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    minHeight: TAP_MIN,
    gap: space[2],
  },
  triggerText: {
    flex: 1,
    fontSize: 17,
  },
  panel: {
    marginTop: space[3],
    borderWidth: 2,
    borderRadius: 16,
    padding: space[3],
    gap: space[3],
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space[2],
  },
  panelHint: {
    flex: 1,
    fontSize: 14,
  },
  timeLabel: {
    fontSize: 14,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: space[1],
    gap: 0,
  },
});
