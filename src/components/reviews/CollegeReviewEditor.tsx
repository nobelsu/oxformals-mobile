import { ReviewFormSection } from "@/src/components/reviews/ReviewFormSection";
import {
  ReviewImageUploadField,
  type ReviewImageDraft,
} from "@/src/components/reviews/ReviewImageUploadField";
import { StarRating } from "@/src/components/reviews/StarRating";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxInput } from "@/src/components/ui/OxInput";
import { OxModal } from "@/src/components/ui/OxModal";
import { OxText } from "@/src/components/ui/OxText";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  COLLEGE_REVIEW_CATEGORIES,
  type CollegeReviewPublic,
  type CollegeReviewRatings,
} from "@/lib/data/collegeReviews";
import { useMutation } from "convex/react";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

const EMPTY_RATINGS: CollegeReviewRatings = {
  food: 0,
  atmosphere: 0,
  value: 0,
  overall: 0,
};

function draftFromReview(review: CollegeReviewPublic): {
  ratings: CollegeReviewRatings;
  comment: string;
  imageDrafts: ReviewImageDraft[];
} {
  const ids = review.imageIds ?? [];
  const urls = review.imageUrls ?? [];
  return {
    ratings: review.ratings,
    comment: review.comment ?? "",
    imageDrafts: ids.map((storageId, i) => ({
      storageId: storageId as Id<"_storage">,
      previewUrl: urls[i] ?? "",
      fileName: `Photo ${i + 1}`,
    })),
  };
}

type Props = {
  review: CollegeReviewPublic;
  onSaved: () => void;
  onCancel: () => void;
};

export function CollegeReviewEditor({ review, onSaved, onCancel }: Props) {
  const { colors } = useOxTheme();
  const initial = draftFromReview(review);
  const [draft, setDraft] = useState<CollegeReviewRatings>(initial.ratings);
  const [comment, setComment] = useState(initial.comment);
  const [imageDrafts, setImageDrafts] = useState<ReviewImageDraft[]>(
    initial.imageDrafts,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

  const updateReview = useMutation(api.collegeReviews.updateReview);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);

  const resetDraft = useCallback(() => {
    const next = draftFromReview(review);
    setDraft(next.ratings);
    setComment(next.comment);
    setImageDrafts(next.imageDrafts);
    setError(null);
  }, [review]);

  const ratingsComplete = useMemo(
    () => COLLEGE_REVIEW_CATEGORIES.every((c) => draft[c.key] >= 1),
    [draft],
  );

  function openSubmitConfirm() {
    if (!ratingsComplete) {
      setError("Please rate every category.");
      return;
    }
    setError(null);
    setConfirmSubmitOpen(true);
  }

  async function handleConfirmSubmit(postAnonymously: boolean) {
    setConfirmSubmitOpen(false);
    setSubmitting(true);
    setError(null);
    const imageIds =
      imageDrafts.length > 0 ? imageDrafts.map((d) => d.storageId) : undefined;
    try {
      await updateReview({
        reviewId: review.id as Id<"collegeReviews">,
        nowMs: Date.now(),
        ratings: draft,
        comment: comment || undefined,
        imageIds,
        isAnonymous: postAnonymously,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <View style={styles.form}>
        <ReviewFormSection title="Ratings" first>
          <View style={styles.ratings}>
            {COLLEGE_REVIEW_CATEGORIES.map((cat) => (
              <StarRating
                key={cat.key}
                label={cat.label}
                value={draft[cat.key]}
                onChange={(n) => setDraft((prev) => ({ ...prev, [cat.key]: n }))}
                size="sm"
              />
            ))}
          </View>
        </ReviewFormSection>
        <ReviewFormSection title="Review" optional>
          <OxInput
            value={comment}
            onChangeText={setComment}
            placeholder="Food, atmosphere, value tips…"
            multiline
            maxLength={2000}
          />
        </ReviewFormSection>
        <ReviewFormSection title="Photos" optional>
          <ReviewImageUploadField
            imageDrafts={imageDrafts}
            onChange={setImageDrafts}
            generateUploadUrl={() => generateUploadUrl({})}
            disabled={submitting}
          />
        </ReviewFormSection>
        <View style={styles.actions}>
          <OxButton
            title={submitting ? "Saving…" : "Save changes"}
            onPress={openSubmitConfirm}
            disabled={submitting || !ratingsComplete}
          />
          <OxButton
            title="Cancel"
            variant="secondary"
            onPress={() => {
              resetDraft();
              onCancel();
            }}
            disabled={submitting}
          />
        </View>
      </View>

      {error ? (
        <OxText style={[styles.error, { color: colors.danger }]}>{error}</OxText>
      ) : null}

      <OxModal
        visible={confirmSubmitOpen}
        onClose={() => setConfirmSubmitOpen(false)}
        title="Save review?"
        scrollable={false}
      >
        <OxText style={{ color: colors.inkMuted, fontSize: 14, lineHeight: 20 }}>
          Would you like to post this review anonymously? Anonymous reviews
          won&apos;t show your name on your profile.
        </OxText>
        <View style={styles.modalActions}>
          <OxButton
            title="Yes, post anonymously"
            onPress={() => void handleConfirmSubmit(true)}
            disabled={submitting}
          />
          <OxButton
            title="No, show my name"
            variant="secondary"
            onPress={() => void handleConfirmSubmit(false)}
            disabled={submitting}
          />
        </View>
      </OxModal>
    </>
  );
}

const styles = StyleSheet.create({
  form: { gap: 0 },
  ratings: { gap: 10 },
  actions: { marginTop: 16, gap: 8 },
  error: { fontSize: 14, marginTop: 12 },
  modalActions: { marginTop: 20, gap: 8 },
});
