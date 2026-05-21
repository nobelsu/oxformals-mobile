import { DoodleOutline } from "@/src/components/ui/DoodleOutline";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { space } from "@/src/constants/spacing";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";

type Props = {
  label?: string;
};

/** Stack header back control — matches doodle / Schoolbell theme. */
export function OxBackButton({ label = "Back" }: Props) {
  const router = useRouter();
  const { colors } = useOxTheme();

  return (
    <Pressable
      onPress={() => router.back()}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      style={({ pressed }) => [
        styles.pressable,
        { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      <DoodleOutline
        seed={7}
        fill={colors.paper}
        stroke={colors.ink}
        dashed
        contentStyle={styles.inner}
      >
        <Text style={[styles.text, { color: colors.ink, fontFamily: FONT_DISPLAY }]}>
          ← {label}
        </Text>
      </DoodleOutline>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignSelf: "flex-start",
    marginLeft: space[1],
    marginRight: space[4],
  },
  inner: {
    paddingVertical: space[1],
    paddingHorizontal: space[3],
  },
  text: {
    fontSize: 16,
    letterSpacing: 0.2,
  },
});
