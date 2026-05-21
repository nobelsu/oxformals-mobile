import { DoodleExchangeIcon } from "@/src/components/ui/DoodleExchangeIcon";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { oxText } from "@/src/constants/oxText";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { formatListingDate } from "@/src/lib/data/format";
import {
  requestFormalRoleLabel,
  type RequestFormalSlot,
} from "@/src/lib/data/requestDisplay";
import { StyleSheet, Text, View, type TextStyle, type ViewStyle } from "react-native";

type Props = {
  slots: RequestFormalSlot[];
};

type SlotAlign = "left" | "right";

function FormalSlot({
  slot,
  align,
  colors,
}: {
  slot: RequestFormalSlot;
  align: SlotAlign;
  colors: { ink: string; inkMuted: string; inkSoft: string };
}) {
  const textAlign: TextStyle["textAlign"] = align === "right" ? "right" : "left";
  const containerAlign: ViewStyle["alignItems"] =
    align === "right" ? "flex-end" : "flex-start";

  return (
    <View style={[styles.slot, { alignItems: containerAlign }]}>
      <Text
        style={[styles.role, oxText, { color: colors.inkSoft, textAlign }]}
        numberOfLines={1}
      >
        {requestFormalRoleLabel(slot.role)}
      </Text>
      <Text
        style={[
          styles.college,
          oxText,
          { color: colors.ink, fontFamily: FONT_DISPLAY, textAlign },
        ]}
        numberOfLines={1}
      >
        {slot.listing.college}
      </Text>
      <Text
        style={[styles.date, oxText, { color: colors.inkMuted, textAlign }]}
        numberOfLines={1}
      >
        {formatListingDate(slot.listing.dateTime)}
      </Text>
    </View>
  );
}

export function RequestRowFormals({ slots }: Props) {
  const { colors } = useOxTheme();

  if (slots.length === 0) return null;

  if (slots.length === 1) {
    return (
      <View style={styles.root}>
        <FormalSlot slot={slots[0]!} align="left" colors={colors} />
      </View>
    );
  }

  const [left, right] = slots;

  return (
    <View style={styles.root}>
      <View style={styles.swapRow}>
        <View style={styles.side}>
          <FormalSlot slot={left!} align="left" colors={colors} />
        </View>
        <DoodleExchangeIcon size={26} seed={17} style={styles.exchangeIcon} />
        <View style={styles.side}>
          <FormalSlot slot={right!} align="right" colors={colors} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginTop: 8,
  },
  swapRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  side: {
    flex: 1,
    minWidth: 0,
  },
  exchangeIcon: {
    flexShrink: 0,
  },
  slot: {
    gap: 1,
    minWidth: 0,
  },
  role: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  college: {
    fontSize: 16,
    lineHeight: 20,
  },
  date: {
    fontSize: 12,
    lineHeight: 16,
  },
});
