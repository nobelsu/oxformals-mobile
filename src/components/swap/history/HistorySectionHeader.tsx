import { OxButton } from "@/src/components/ui/OxButton";
import { tabScreenTitleText } from "@/src/constants/layout";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  title: string;
  showSeeAll?: boolean;
  onSeeAll?: () => void;
};

export function HistorySectionHeader({ title, showSeeAll, onSeeAll }: Props) {
  const { colors } = useOxTheme();

  return (
    <View style={styles.row}>
      <Text style={[styles.title, tabScreenTitleText, { color: colors.ink }]}>
        {title}
      </Text>
      {showSeeAll && onSeeAll ? (
        <OxButton
          title="See all"
          variant="secondary"
          onPress={onSeeAll}
          style={styles.seeAll}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  title: {
    flex: 1,
  },
  seeAll: { flexShrink: 0 },
});
