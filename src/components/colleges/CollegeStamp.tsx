import { OxText } from "@/src/components/ui/OxText";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { stampLabel } from "@/lib/data/badges";
import { StyleSheet, View } from "react-native";

type Props = {
  college: string;
  size?: number;
};

/** A college's short stamp label in an inked circle; stands in for its crest. */
export function CollegeStamp({ college, size = 44 }: Props) {
  const { colors } = useOxTheme();
  const label = stampLabel(college);
  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: colors.ink,
          backgroundColor: colors.bg,
        },
      ]}
      accessible={false}
    >
      <OxText
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{
          color: colors.ink,
          fontSize: size * (label.length > 3 ? 0.27 : 0.32),
        }}
      >
        {label}
      </OxText>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
});
