import { useOxTheme } from "@/src/contexts/ThemeContext";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

const STAR_PATH =
  "m12 4 2.3 4.7L20 9.5l-4 3.9.9 5.6L12 16.5 7.1 19l.9-5.6-4-3.9 5.7-.8z";

type Props = {
  value: number;
  onChange?: (value: number) => void;
  label: string;
  size?: "sm" | "md";
};

function RatingStar({
  filled,
  preview,
  size,
  index,
  colors,
}: {
  filled: boolean;
  preview?: boolean;
  size: "sm" | "md";
  index: number;
  colors: ReturnType<typeof useOxTheme>["colors"];
}) {
  const dim = size === "sm" ? 20 : 24;
  const wobble = (index - 3) * 1.25;
  const fillColor = preview ? colors.accentHover : colors.accent;

  return (
    <Svg
      width={dim}
      height={dim}
      viewBox="0 0 24 24"
      style={{ transform: [{ rotate: `${wobble}deg` }] }}
    >
      <Path
        d={STAR_PATH}
        fill={filled ? fillColor : "none"}
        stroke={filled ? colors.ink : colors.inkSoft}
        strokeWidth={filled ? 2 : 1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={filled ? 1 : 0.4}
      />
    </Svg>
  );
}

export function StarIcon({ size = 16 }: { size?: number }) {
  const { colors } = useOxTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d={STAR_PATH}
        fill={colors.accent}
        stroke={colors.ink}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function StarRating({ value, onChange, label, size = "md" }: Props) {
  const { colors } = useOxTheme();
  const interactive = onChange !== undefined;
  const starSize = size === "sm" ? 28 : 32;

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: colors.inkMuted }]}>{label}</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= Math.round(value);
          const icon = (
            <RatingStar
              filled={filled}
              size={size}
              index={star}
              colors={colors}
            />
          );

          if (interactive) {
            return (
              <Pressable
                key={star}
                onPress={() => onChange(star)}
                accessibilityRole="radio"
                accessibilityState={{ checked: value === star }}
                accessibilityLabel={`${star} star${star === 1 ? "" : "s"}`}
                style={[styles.starButton, { width: starSize, height: starSize }]}
              >
                {icon}
              </Pressable>
            );
          }

          return (
            <View
              key={star}
              style={[styles.starButton, { width: starSize, height: starSize }]}
            >
              {icon}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  label: { fontSize: 14, flex: 1 },
  stars: { flexDirection: "row", gap: 2 },
  starButton: { alignItems: "center", justifyContent: "center" },
});
