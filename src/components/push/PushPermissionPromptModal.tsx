import { OxButton } from "@/src/components/ui/OxButton";
import { OxModal } from "@/src/components/ui/OxModal";
import { OxText } from "@/src/components/ui/OxText";
import { SketchCard } from "@/src/components/ui/SketchCard";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { space } from "@/src/constants/spacing";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { Linking, StyleSheet, Text } from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function PushPermissionPromptModal({ visible, onClose }: Props) {
  const { colors } = useOxTheme();

  const handleOpenSettings = () => {
    void Linking.openSettings();
    onClose();
  };

  return (
    <OxModal
      visible={visible}
      onClose={onClose}
      showCloseButton={false}
      scrollable={false}
    >
      <SketchCard seed={7} padding={space[6]} style={styles.card}>
        <Text
          style={[
            styles.title,
            { color: colors.ink, fontFamily: FONT_DISPLAY },
          ]}
        >
          NOTIFICATIONS ARE OFF
        </Text>
        <OxText style={[styles.body, { color: colors.inkMuted }]}>
          To get chat alerts, turn on notifications for Oxformals in your device
          settings.
        </OxText>
        <OxButton
          title="Open Settings"
          onPress={handleOpenSettings}
          style={{ marginTop: space[5] }}
        />
        <OxButton
          title="Not now"
          variant="ghost"
          onPress={onClose}
          style={{ marginTop: space[2] }}
        />
      </SketchCard>
    </OxModal>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
  },
  title: {
    fontSize: 22,
    marginBottom: space[3],
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
});
