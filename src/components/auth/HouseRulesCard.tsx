import { OxText } from "@/src/components/ui/OxText";
import { SketchCard } from "@/src/components/ui/SketchCard";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { space } from "@/src/constants/spacing";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { StyleSheet, Text, View } from "react-native";

export const HOUSE_RULES = [
  "Be respectful and courteous to everyone you interact with.",
  "Only use your real Oxford email — no impersonation.",
  "Honour confirmed swaps. Don't ghost after accepting a request.",
  "Don't create fake or duplicate listings.",
  "Reach out to your swap partner promptly after a match is confirmed.",
  "Report any issues or inappropriate behaviour to the team.",
] as const;

export function HouseRulesCard() {
  const { colors } = useOxTheme();

  return (
    <SketchCard seed={3} padding={space[4]} style={styles.card}>
      <View style={styles.rules}>
        {HOUSE_RULES.map((rule, i) => (
          <View key={rule}>
            <View style={styles.ruleRow}>
              <View
                style={[
                  styles.ruleBadge,
                  {
                    backgroundColor: colors.accent,
                    borderColor: colors.ink,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.ruleNum,
                    { color: colors.accentInk, fontFamily: FONT_DISPLAY },
                  ]}
                >
                  {i + 1}
                </Text>
              </View>
              <OxText style={[styles.ruleText, { color: colors.inkMuted }]}>
                {rule}
              </OxText>
            </View>
            {i < HOUSE_RULES.length - 1 ? (
              <View
                style={[styles.divider, { backgroundColor: colors.ink }]}
              />
            ) : null}
          </View>
        ))}
      </View>
    </SketchCard>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: "stretch",
  },
  rules: {
    gap: space[4],
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space[3],
  },
  ruleBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  ruleNum: {
    fontSize: 15,
    lineHeight: 20,
  },
  ruleText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
  },
  divider: {
    height: StyleSheet.hairlineWidth * 2,
    marginTop: space[4],
    opacity: 0.12,
  },
});
