import { DoodleOutline } from "@/src/components/ui/DoodleOutline";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import type { ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

type Props = {
  children: ReactNode;
  seed: number;
  mine?: boolean;
  style?: ViewStyle;
};

function messageSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

export function DoodleBubble({ children, seed, mine, style }: Props) {
  const { colors } = useOxTheme();

  return (
    <View style={[styles.wrap, style]}>
      <DoodleOutline
        seed={seed}
        fill={mine ? colors.accent : colors.paper}
        stroke={colors.ink}
        dashed={false}
        contentStyle={styles.inner}
      >
        {children}
      </DoodleOutline>
    </View>
  );
}

export { messageSeed };

const BUBBLE_PADDING = 10;

const styles = StyleSheet.create({
  wrap: {
    maxWidth: "100%",
  },
  inner: {
    padding: BUBBLE_PADDING,
  },
});

export { BUBBLE_PADDING };
