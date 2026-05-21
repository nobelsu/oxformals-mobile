import { SCREEN_PADDING, TAB_SCREEN_EDGES } from "@/src/constants/layout";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import type { ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type ViewStyle,
} from "react-native";
import {
  SafeAreaView,
  type Edge,
} from "react-native-safe-area-context";

type Props = {
  children: ReactNode;
  scroll?: boolean;
  center?: boolean;
  edges?: Edge[];
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
} & Pick<ScrollViewProps, "keyboardShouldPersistTaps">;

export function ScreenContent({
  children,
  scroll,
  center,
  edges = TAB_SCREEN_EDGES,
  style,
  contentContainerStyle,
  keyboardShouldPersistTaps,
}: Props) {
  const { colors } = useOxTheme();

  const rootStyle = [styles.root, { backgroundColor: colors.bg }, style];

  if (scroll) {
    return (
      <SafeAreaView style={rootStyle} edges={edges}>
        <ScrollView
          style={styles.fill}
          contentContainerStyle={[
            styles.scrollContent,
            center && styles.center,
            { paddingHorizontal: SCREEN_PADDING },
            contentContainerStyle,
          ]}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps ?? "handled"}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={rootStyle} edges={edges}>
      <View
        style={[
          styles.fill,
          styles.container,
          center && styles.center,
          { paddingHorizontal: SCREEN_PADDING },
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  container: {
    flex: 1,
    paddingBottom: SCREEN_PADDING,
  },
  scrollContent: {
    paddingBottom: SCREEN_PADDING,
  },
  center: {
    justifyContent: "center",
  },
});
