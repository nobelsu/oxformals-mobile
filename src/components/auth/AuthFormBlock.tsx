import { authElevation } from "@/src/components/auth/authStyles";
import { DoodleOutline } from "@/src/components/ui/DoodleOutline";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { space } from "@/src/constants/spacing";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  /** Primary field (email, code, etc.). Omit for action-only blocks. */
  input?: ReactNode;
  action: ReactNode;
  secondary?: ReactNode;
  error?: string | null;
};

/**
 * Groups input + CTA into one bordered, elevated control — reads as a single step.
 */
export function AuthFormBlock({ input, action, secondary, error }: Props) {
  const { colors } = useOxTheme();

  return (
    <View style={styles.wrap}>
      <DoodleOutline
        seed={24}
        fill={colors.paper}
        stroke={colors.ink}
        dashed={false}
        elevated
        style={StyleSheet.flatten([
          styles.panel,
          authElevation(colors.ink),
        ])}
        contentStyle={styles.panelInner}
      >
        {input ? <View style={styles.inputSlot}>{input}</View> : null}
        {input ? (
          <View style={[styles.divider, { backgroundColor: colors.ink }]} />
        ) : null}
        <View style={styles.actionSlot}>{action}</View>
      </DoodleOutline>

      {error ? (
        <Text
          style={[
            styles.error,
            { color: colors.danger, fontFamily: FONT_DISPLAY },
          ]}
          accessibilityRole="alert"
        >
          {error}
        </Text>
      ) : null}

      {secondary ? <View style={styles.secondary}>{secondary}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space[2],
  },
  panel: {
    alignSelf: "stretch",
    borderRadius: space[2],
    overflow: "hidden",
  },
  panelInner: {
    padding: 0,
  },
  inputSlot: {
    paddingHorizontal: space[2],
    paddingTop: space[1],
    paddingBottom: space[1],
  },
  divider: {
    height: StyleSheet.hairlineWidth * 2,
    marginHorizontal: space[3],
    opacity: 0.14,
  },
  actionSlot: {
    paddingHorizontal: space[2],
    paddingVertical: space[2],
  },
  error: {
    fontSize: 14,
    lineHeight: 18,
    textAlign: "center",
  },
  secondary: {
    alignItems: "center",
    paddingTop: space[1],
  },
});
