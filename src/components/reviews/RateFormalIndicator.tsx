import { StarIcon } from "@/src/components/reviews/StarRating";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  style?: object;
};

export function RateFormalIndicator({ style }: Props) {
  const { colors } = useOxTheme();

  return (
    <View style={[styles.root, style]} accessibilityElementsHidden>
      <StarIcon size={16} />
      <Text style={[styles.label, { color: colors.accentHover }]}>
        Rate formal
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  label: { fontSize: 12, fontWeight: "500" },
});
