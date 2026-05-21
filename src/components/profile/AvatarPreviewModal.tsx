import { Avatar } from "@/src/components/ui/Avatar";
import { DoodleCloseButton } from "@/src/components/ui/DoodleCloseButton";
import type { AvatarSource } from "@/src/lib/auth/types";
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PREVIEW_SIZE = Math.min(Dimensions.get("window").width * 0.72, 280);

type Props = {
  visible: boolean;
  onClose: () => void;
  avatar?: AvatarSource;
  name: string;
};

export function AvatarPreviewModal({
  visible,
  onClose,
  avatar,
  name,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close profile photo preview"
        />
        <View
          style={[styles.closeRow, { paddingTop: insets.top + 12 }]}
          pointerEvents="box-none"
        >
          <DoodleCloseButton
            onPress={onClose}
            accessibilityLabel="Close profile photo preview"
            variant="iconOnly"
            seed={42}
          />
        </View>
        <View
          style={styles.previewWrap}
          pointerEvents="none"
          accessibilityRole="image"
          accessibilityLabel={`${name} profile photo`}
        >
          <Avatar avatar={avatar} name={name} size={PREVIEW_SIZE} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeRow: {
    position: "absolute",
    top: 0,
    right: 16,
    zIndex: 1,
  },
  previewWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
