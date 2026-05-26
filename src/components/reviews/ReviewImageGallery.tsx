import { useOxTheme } from "@/src/contexts/ThemeContext";
import { Image } from "expo-image";
import { ScrollView, StyleSheet, View } from "react-native";

type Props = {
  imageUrls: string[];
};

export function ReviewImageGallery({ imageUrls }: Props) {
  const { colors } = useOxTheme();

  if (imageUrls.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      {imageUrls.map((url, index) => (
        <View
          key={`${url}-${index}`}
          style={[styles.thumbWrap, { borderColor: colors.ink }]}
        >
          <Image
            source={{ uri: url }}
            style={styles.thumb}
            contentFit="cover"
            accessibilityLabel={`Review photo ${index + 1}`}
          />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { marginTop: 12 },
  row: { gap: 8 },
  thumbWrap: {
    borderWidth: 2,
    borderRadius: 8,
    overflow: "hidden",
  },
  thumb: { width: 80, height: 80 },
});
