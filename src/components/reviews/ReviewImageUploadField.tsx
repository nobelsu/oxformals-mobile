import { OxButton } from "@/src/components/ui/OxButton";
import { OxText } from "@/src/components/ui/OxText";
import { pickReviewImageFromLibrary } from "@/src/lib/upload/pickReviewImageFromLibrary";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { uploadImageFileMobile } from "@/lib/upload/imageFile";
import type { Id } from "@/convex/_generated/dataModel";
import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

export const MAX_REVIEW_IMAGES = 3;

export type ReviewImageDraft = {
  storageId: Id<"_storage">;
  previewUrl: string;
  fileName?: string;
};

type Props = {
  imageDrafts: ReviewImageDraft[];
  onChange: (drafts: ReviewImageDraft[]) => void;
  generateUploadUrl: () => Promise<string>;
  disabled?: boolean;
};

export function ReviewImageUploadField({
  imageDrafts,
  onChange,
  generateUploadUrl,
  disabled = false,
}: Props) {
  const { colors } = useOxTheme();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAdd = imageDrafts.length < MAX_REVIEW_IMAGES && !uploading && !disabled;

  async function handleAddPhoto() {
    if (imageDrafts.length >= MAX_REVIEW_IMAGES) {
      setError(`You can attach at most ${MAX_REVIEW_IMAGES} images.`);
      return;
    }

    const picked = await pickReviewImageFromLibrary();
    if (!picked.ok) {
      if (picked.reason === "invalid" && picked.message) {
        setError(picked.message);
      }
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const storageId = await uploadImageFileMobile(
        picked.asset,
        generateUploadUrl,
      );
      onChange([
        ...imageDrafts,
        {
          storageId,
          previewUrl: picked.asset.uri,
          fileName: picked.asset.name,
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not upload image.");
    } finally {
      setUploading(false);
    }
  }

  function removeDraft(index: number) {
    onChange(imageDrafts.filter((_, i) => i !== index));
  }

  return (
    <View style={styles.root}>
      {imageDrafts.length > 0 ? (
        <View style={styles.thumbs}>
          {imageDrafts.map((img, index) => (
            <View key={String(img.storageId)} style={styles.thumbWrap}>
              <Image
                source={{ uri: img.previewUrl }}
                style={[styles.thumb, { borderColor: colors.ink }]}
                contentFit="cover"
              />
              <Pressable
                onPress={() => removeDraft(index)}
                disabled={uploading || disabled}
                style={[styles.removeBtn, { borderColor: colors.ink, backgroundColor: colors.bg }]}
                accessibilityLabel={`Remove photo ${index + 1}`}
              >
                <OxText style={{ fontSize: 12, lineHeight: 14 }}>×</OxText>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
      <View style={styles.actions}>
        <OxButton
          title={uploading ? "Uploading…" : "Add photo"}
          variant="secondary"
          onPress={() => void handleAddPhoto()}
          disabled={!canAdd}
        />
        <OxText style={{ color: colors.inkSoft, fontSize: 12 }}>
          {imageDrafts.length}/{MAX_REVIEW_IMAGES}
        </OxText>
      </View>
      {error ? (
        <OxText style={{ color: colors.danger, fontSize: 14, marginTop: 4 }}>
          {error}
        </OxText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  thumbs: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  thumbWrap: { position: "relative" },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
  },
  removeBtn: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
});
