import { authElevation } from "@/src/components/auth/authStyles";
import { DoodleOutline } from "@/src/components/ui/DoodleOutline";
import { OxSpinner } from "@/src/components/ui/OxSpinner";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { space, TAP_MIN } from "@/src/constants/spacing";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type ViewStyle,
} from "react-native";

type Variant = "primary" | "secondary" | "danger" | "ghost";

type Props = PressableProps & {
  title: string;
  variant?: Variant;
  loading?: boolean;
  seed?: number;
  /** Hand-drawn dashed border; defaults to true for secondary. */
  dashed?: boolean;
  /** Fills AuthFormBlock action slot — no outer doodle border. */
  bare?: boolean;
};

function labelSeed(title: string): number {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

export function OxButton({
  title,
  variant = "primary",
  loading,
  disabled,
  style,
  seed: seedProp,
  dashed: dashedProp,
  bare,
  ...rest
}: Props) {
  const { colors } = useOxTheme();
  const isDisabled = disabled || loading;
  const seed = seedProp ?? labelSeed(title);
  const dashed = dashedProp ?? variant === "secondary";

  const bg =
    variant === "primary"
      ? colors.accent
      : variant === "danger"
        ? colors.danger
        : variant === "secondary"
          ? colors.paper
          : "transparent";

  const textColor =
    variant === "primary"
      ? colors.accentInk
      : variant === "danger"
        ? "#ffffff"
        : colors.ink;

  const label = loading ? (
    <OxSpinner size="sm" color={textColor} />
  ) : (
    <Text style={[styles.text, { color: textColor }]}>{title}</Text>
  );

  if (variant === "ghost") {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.ghost,
          { opacity: isDisabled ? 0.5 : pressed ? 0.7 : 1 },
          style as ViewStyle,
        ]}
        disabled={isDisabled}
        {...rest}
      >
        {label}
      </Pressable>
    );
  }

  if (bare) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.bare,
          {
            backgroundColor:
              pressed && !isDisabled && variant === "primary"
                ? colors.accentHover
                : bg,
            opacity: isDisabled ? 0.5 : 1,
            transform: [{ scale: pressed && !isDisabled ? 0.98 : 1 }],
          },
          style as ViewStyle,
        ]}
        disabled={isDisabled}
        {...rest}
      >
        {label}
      </Pressable>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [
        variant === "primary" ? (authElevation(colors.ink) as ViewStyle) : undefined,
        {
          opacity: isDisabled ? 0.5 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.98 : 1 }],
        },
        style as ViewStyle,
      ]}
      disabled={isDisabled}
      {...rest}
    >
      {({ pressed }) => (
        <DoodleOutline
          seed={seed}
          fill={
            pressed && !isDisabled && variant === "primary"
              ? colors.accentHover
              : bg
          }
          stroke={colors.ink}
          dashed={dashed}
          style={styles.outline}
          contentStyle={styles.btnInner}
        >
          {label}
        </DoodleOutline>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outline: {
    alignSelf: "stretch",
  },
  btnInner: {
    paddingVertical: space[2],
    paddingHorizontal: space[4],
    alignItems: "center",
    justifyContent: "center",
    minHeight: TAP_MIN,
  },
  bare: {
    alignSelf: "stretch",
    minHeight: TAP_MIN,
    paddingVertical: space[2],
    paddingHorizontal: space[3],
    alignItems: "center",
    justifyContent: "center",
    borderRadius: space[1],
  },
  ghost: {
    paddingVertical: space[2],
    paddingHorizontal: space[4],
    alignItems: "center",
    minHeight: TAP_MIN,
    justifyContent: "center",
  },
  text: {
    fontSize: 17,
    fontFamily: FONT_DISPLAY,
    letterSpacing: 0.2,
  },
});
