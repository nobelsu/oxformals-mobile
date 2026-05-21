import { FONT_DISPLAY } from "@/src/constants/fonts";
import { oxText } from "@/src/constants/oxText";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import type { RequestType } from "@/src/lib/data/types";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  requestType: RequestType;
};

const LABELS: Record<RequestType, string> = {
  swap: "Swap",
  pay: "Pay",
};

export function RequestTypeTag({ requestType }: Props) {
  const { colors } = useOxTheme();
  const isPay = requestType === "pay";

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: isPay ? colors.accent : colors.tag,
          borderColor: isPay ? colors.accent : colors.tag,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          oxText,
          {
            color: isPay ? colors.accentInk : colors.tagInk,
            fontFamily: FONT_DISPLAY,
          },
        ]}
      >
        {LABELS[requestType]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  label: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
