import { OxText } from "@/src/components/ui/OxText";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

type Props = {
  title: string;
  optional?: boolean;
  children: ReactNode;
  first?: boolean;
};

export function ReviewFormSection({
  title,
  optional = false,
  children,
  first = false,
}: Props) {
  const { colors } = useOxTheme();

  return (
    <View
      style={[
        styles.section,
        !first && { borderTopColor: `${colors.ink}1F`, borderTopWidth: 1 },
      ]}
    >
      <View style={styles.header}>
        <OxText
          style={[
            styles.title,
            { color: colors.ink, fontFamily: FONT_DISPLAY },
          ]}
        >
          {title}
        </OxText>
        {optional ? (
          <OxText style={{ color: colors.inkSoft, fontSize: 12 }}>
            Optional
          </OxText>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingTop: 16, gap: 12 },
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    gap: 8,
  },
  title: {
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
