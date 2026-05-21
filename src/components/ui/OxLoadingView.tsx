import { OxSpinner } from "@/src/components/ui/OxSpinner";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { space } from "@/src/constants/spacing";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";

type Props = {
  message?: string;
  fill?: boolean;
  style?: ViewStyle;
};

export function OxLoadingView({ message, fill, style }: Props) {
  const { colors } = useOxTheme();

  return (
    <View style={[fill && styles.fill, styles.center, style]}>
      <OxSpinner size="lg" />
      {message ? (
        <Text
          style={[
            styles.message,
            { color: colors.inkMuted, fontFamily: FONT_DISPLAY },
          ]}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
  },
  message: {
    marginTop: space[3],
    fontSize: 16,
    textAlign: "center",
  },
});
