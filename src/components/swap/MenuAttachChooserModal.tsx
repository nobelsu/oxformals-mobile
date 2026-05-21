import { OxButton } from "@/src/components/ui/OxButton";
import { DoodleDivider } from "@/src/components/ui/DoodleDivider";
import { OxText } from "@/src/components/ui/OxText";
import { SketchCard } from "@/src/components/ui/SketchCard";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { space } from "@/src/constants/spacing";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
  onPhotoLibrary: () => void;
  onBrowseFiles: () => void;
};

export function MenuAttachChooserModal({
  visible,
  onClose,
  onPhotoLibrary,
  onBrowseFiles,
}: Props) {
  const { colors } = useOxTheme();

  function handlePhotoLibrary() {
    onClose();
    onPhotoLibrary();
  }

  function handleBrowseFiles() {
    onClose();
    onBrowseFiles();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={styles.cardWrap}
          onPress={(e) => e.stopPropagation()}
        >
          <SketchCard seed={12} padding={space[5]}>
            <Text
              style={[
                styles.title,
                { color: colors.ink, fontFamily: FONT_DISPLAY },
              ]}
            >
              ATTACH MENU
            </Text>
            <OxText style={[styles.subtitle, { color: colors.inkMuted }]}>
              Choose a source
            </OxText>
            <DoodleDivider seed={12} marginVertical={space[4]} />
            <View style={styles.actions}>
              <OxButton
                title="Photo library"
                variant="secondary"
                onPress={handlePhotoLibrary}
              />
              <OxButton
                title="Browse files"
                variant="secondary"
                onPress={handleBrowseFiles}
              />
              <OxButton title="Cancel" variant="ghost" onPress={onClose} />
            </View>
          </SketchCard>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: space[5],
  },
  cardWrap: {
    width: "100%",
    maxWidth: 340,
  },
  title: {
    fontSize: 22,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: space[2],
  },
  actions: {
    gap: 12,
  },
});
