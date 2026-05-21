import { OxButton } from "@/src/components/ui/OxButton";
import { SketchCard } from "@/src/components/ui/SketchCard";
import { TabBarIcon } from "@/src/components/ui/TabBarIcon";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { DISPLAY_HERO } from "@/src/constants/layout";
import { oxText } from "@/src/constants/oxText";
import { space } from "@/src/constants/spacing";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { newChatHref } from "@/src/lib/chat/navigation";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";

type Props = {
  style?: ViewStyle;
};

export function MessagesEmptyState({ style }: Props) {
  const router = useRouter();
  const { colors } = useOxTheme();

  return (
    <SketchCard seed={55} padding={24} style={style}>
      <View style={styles.content}>
        <TabBarIcon
          variant="chats"
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
          Message someone from your college or start a group chat. Your
          conversations will show up here once you send the first message.
        </Text>
        <View style={styles.actions}>
          <OxButton
            title="Start a chat"
            variant="primary"
            seed={56}
            onPress={() => router.push(newChatHref())}
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
    marginTop: space[2],
  },
  button: {
    width: "100%",
  },
});
