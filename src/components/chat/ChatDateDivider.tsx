import { chatText } from "@/src/components/chat/chatText";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type Props = {
  label: string;
  style?: StyleProp<ViewStyle>;
  opacity?: number;
};

export function ChatDateDivider({ label, style, opacity = 1 }: Props) {
  const { colors } = useOxTheme();

  return (
    <View style={[styles.wrap, style, opacity < 1 ? { opacity } : null]}>
      <View
        style={[
          styles.pill,
          {
            backgroundColor: colors.bg,
            borderColor: `${colors.ink}1a`,
          },
        ]}
      >
        <Text style={[chatText, styles.label, { color: colors.inkSoft }]}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "center",
    marginVertical: 12,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  label: {
    fontSize: 12,
  },
});
