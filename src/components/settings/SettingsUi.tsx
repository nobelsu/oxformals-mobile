import { OxSpinner } from "@/src/components/ui/OxSpinner";
import { OxText } from "@/src/components/ui/OxText";
import { SketchCard } from "@/src/components/ui/SketchCard";
import { CARD_GAP, SCREEN_PADDING } from "@/src/constants/layout";
import { TAP_MIN } from "@/src/constants/spacing";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { Children, Fragment, type ComponentProps, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

type IconName = ComponentProps<typeof Ionicons>["name"];

/** A pushed settings screen: native header, paper background, scrolling body. */
export function SettingsScreen({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { colors } = useOxTheme();
  return (
    <>
      <Stack.Screen options={{ title, headerShown: true }} />
      <ScrollView
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {children}
      </ScrollView>
    </>
  );
}

/** A level card holding rows, ruled between. */
export function SettingsGroup({
  seed,
  children,
}: {
  seed: number;
  children: ReactNode;
}) {
  const { colors } = useOxTheme();
  const rows = Children.toArray(children);
  return (
    <SketchCard seed={seed} padding={4} tilt={0.001}>
      {rows.map((row, index) => (
        <Fragment key={index}>
          {index > 0 ? (
            <View style={[styles.rule, { backgroundColor: colors.inkSoft }]} />
          ) : null}
          {row}
        </Fragment>
      ))}
    </SketchCard>
  );
}

/** One tappable line: icon, label, a short current value, chevron. */
export function SettingsRow({
  icon,
  label,
  value,
  onPress,
  danger,
  chevron = true,
  loading,
}: {
  icon: IconName;
  label: string;
  value?: string;
  onPress: () => void;
  danger?: boolean;
  chevron?: boolean;
  loading?: boolean;
}) {
  const { colors } = useOxTheme();
  const tint = danger ? colors.danger : colors.ink;
  return (
    <Pressable
      onPress={loading ? undefined : onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={22} color={tint} />
      <View style={styles.rowText}>
        <OxText style={[styles.label, { color: tint }]}>{label}</OxText>
        {value ? (
          <OxText numberOfLines={1} style={[styles.value, { color: colors.inkMuted }]}>
            {value}
          </OxText>
        ) : null}
      </View>
      {loading ? (
        <OxSpinner size="sm" />
      ) : chevron ? (
        <Ionicons name="chevron-forward-outline" size={20} color={colors.inkSoft} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: SCREEN_PADDING, paddingBottom: 48, gap: CARD_GAP },
  rule: { height: StyleSheet.hairlineWidth, opacity: 0.5, marginHorizontal: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: TAP_MIN + 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  pressed: { opacity: 0.6 },
  rowText: { flex: 1 },
  label: { fontSize: 17 },
  value: { fontSize: 13, lineHeight: 17 },
});
