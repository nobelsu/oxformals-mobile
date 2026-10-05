import { OxText } from "@/src/components/ui/OxText";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  urls: string[];
  /** Photo to open on; null keeps the viewer closed. */
  index: number | null;
  onClose: () => void;
};

/** Review photos full screen: swipe between them, close at the top. */
export function FeedPhotoViewer({ urls, index, onClose }: Props) {
  return (
    <Modal
      visible={index !== null}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {index !== null ? <Pages urls={urls} start={index} onClose={onClose} /> : null}
    </Modal>
  );
}

function Pages({
  urls,
  start,
  onClose,
}: {
  urls: string[];
  start: number;
  onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(start);

  return (
    <View style={styles.root}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        contentOffset={{ x: start * width, y: 0 }}
        onMomentumScrollEnd={(e) =>
          setPage(Math.round(e.nativeEvent.contentOffset.x / width))
        }
      >
        {urls.map((url) => (
          <Image
            key={url}
            source={{ uri: url }}
            style={{ width, height }}
            contentFit="contain"
            accessibilityLabel="Review photo"
          />
        ))}
      </ScrollView>
      <Pressable
        onPress={onClose}
        hitSlop={10}
        style={[styles.close, { top: insets.top + 8 }]}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <Ionicons name="close-outline" size={30} color="#fff" />
      </Pressable>
      {urls.length > 1 ? (
        <OxText style={[styles.count, { bottom: insets.bottom + 16 }]}>
          {page + 1} / {urls.length}
        </OxText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Photos sit on black in both themes.
  root: { flex: 1, backgroundColor: "#000" },
  close: {
    position: "absolute",
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  count: {
    position: "absolute",
    alignSelf: "center",
    color: "#fff",
    fontSize: 14,
  },
});
