import { useListFormalModal } from "@/src/components/listing/ListFormalModalProvider";
import { OxButton } from "@/src/components/ui/OxButton";
import { SketchCard } from "@/src/components/ui/SketchCard";
import { TabBarIcon } from "@/src/components/ui/TabBarIcon";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { DISPLAY_HERO } from "@/src/constants/layout";
import { oxText } from "@/src/constants/oxText";
import { space } from "@/src/constants/spacing";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";

type Props = {
  style?: ViewStyle;
};

export function HistoryEmptyState({ style }: Props) {
  const router = useRouter();
  const { colors } = useOxTheme();
  const { openListFormal } = useListFormalModal();

  return (
    <SketchCard seed={42} padding={24} style={style}>
      <View style={styles.content}>
        <TabBarIcon
          variant="history"
          focused
          color={colors.ink}
          size={DISPLAY_HERO}
        />
        <Text
          style={[
            styles.title,
            { color: colors.ink, fontFamily: FONT_DISPLAY },
          ]}
        >
          Nothing here yet
        </Text>
        <Text style={[styles.body, { color: colors.inkMuted }]}>
          Past listings and swap requests show up here once you&apos;ve listed a
          formal or sent a request.
        </Text>
        <View style={styles.actions}>
          <OxButton
            title="Browse formals"
            variant="secondary"
            seed={43}
            onPress={() => router.push("/(tabs)/browse")}
            style={styles.button}
          />
          <OxButton
            title="List a formal"
            variant="primary"
            seed={44}
            onPress={openListFormal}
            style={styles.button}
          />
        </View>
      </View>
    </SketchCard>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
    gap: space[3],
  },
  title: {
    fontSize: 22,
    textTransform: "uppercase",
    textAlign: "center",
  },
  body: {
    ...oxText,
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    width: "100%",
    gap: space[3],
    marginTop: space[2],
  },
  button: {
    width: "100%",
  },
});
