import { ChatDateDivider } from "@/src/components/chat/ChatDateDivider";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

type Props = {
  label: string;
  pushOffset: number;
};

export function ChatStickyDateHeader({ label, pushOffset }: Props) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = -pushOffset;
  }, [pushOffset, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={styles.host} pointerEvents="none">
      <Animated.View style={animatedStyle}>
        <ChatDateDivider label={label} style={styles.divider} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    top: 8,
    left: 0,
    right: 0,
    zIndex: 1,
    alignItems: "center",
  },
  divider: {
    marginVertical: 0,
  },
});
