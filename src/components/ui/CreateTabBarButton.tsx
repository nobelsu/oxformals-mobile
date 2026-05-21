import { useListFormalModal } from "@/src/components/listing/ListFormalModalProvider";
import { DoodleAddButton } from "@/src/components/ui/DoodleAddButton";
import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { StyleSheet, View } from "react-native";

export function CreateTabBarButton({ style }: BottomTabBarButtonProps) {
  const { openListFormal } = useListFormalModal();

  return (
    <View style={[style, styles.container]}>
      <View style={styles.buttonWrap}>
        <DoodleAddButton
          seed={24}
          size={52}
          accessibilityLabel="List a formal"
          onPress={openListFormal}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "flex-end",
  },
  buttonWrap: {
    top: -12,
    alignItems: "center",
    justifyContent: "center",
  },
});
