import { useAuth } from "@/src/components/auth/useAuth";
import { CollegeReviewEditor } from "@/src/components/reviews/CollegeReviewEditor";
import { ConfirmAttendanceSection } from "@/src/components/reviews/ConfirmAttendanceSection";
import { ReviewFormSection } from "@/src/components/reviews/ReviewFormSection";
import {
  ReviewImageUploadField,
  type ReviewImageDraft,
} from "@/src/components/reviews/ReviewImageUploadField";
import { ReviewImageGallery } from "@/src/components/reviews/ReviewImageGallery";
import { StarRating } from "@/src/components/reviews/StarRating";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxInput } from "@/src/components/ui/OxInput";
import { OxModal } from "@/src/components/ui/OxModal";
import { OxText } from "@/src/components/ui/OxText";
import { SketchCard } from "@/src/components/ui/SketchCard";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { useNowMs } from "@/src/lib/hooks/useNowMs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  COLLEGE_REVIEW_CATEGORIES,
  type CollegeReviewRatings,
} from "@/lib/data/collegeReviews";
import { isGuestForCollegeListing } from "@/lib/data/collegeReviewEligibility";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

const EMPTY_RATINGS: CollegeReviewRatings = {
  food: 0,
  atmosphere: 0,
  value: 0,
  overall: 0,
};

type Props = {
  listingId: string;
  college: string;
};

export function ReviewFormalSection({ listingId, college }: Props) {
  const router = useRouter();
  const { colors } = useOxTheme();
  const { isAuthenticated, user } = useAuth();
  const nowMs = useNowMs();
  const [editing, setEditing] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reported, setReported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const state = useQuery(
    api.collegeReviews.getListingReviewState,
    isAuthenticated
      ? { listingId: listingId as Id<"listings">, nowMs }
      : "skip",
  );

  const submitReview = useMutation(api.collegeReviews.submitReview);
  const reportReview = useMutation(api.collegeReviews.reportReview);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);

  const [draft, setDraft] = useState<CollegeReviewRatings>(EMPTY_RATINGS);
  const [comment, setComment] = useState("");
  const [imageDrafts, setImageDrafts] = useState<ReviewImageDraft[]>([]);

  const ratingsComplete = useMemo(
    () => COLLEGE_REVIEW_CATEGORIES.every((c) => draft[c.key] >= 1),
    [draft],
  );

  if (isAuthenticated && user && !isGuestForCollegeListing(user, college)) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <SketchCard padding={20}>
        <OxText
          style={[
            styles.title,
            { color: colors.ink, fontFamily: FONT_DISPLAY },
          ]}
        >
          Rate this formal
        </OxText>
        <OxText style={{ color: colors.inkMuted, fontSize: 14, marginTop: 8 }}>
          Sign in to rate your experience at {college}.
        </OxText>
        <OxButton
          title="Sign in"
          variant="secondary"
          onPress={() => router.push("/login")}
          style={{ marginTop: 12, alignSelf: "flex-start" }}
        />
      </SketchCard>
    );
  }

  if (state === undefined) {
    return (
      <SketchCard padding={20}>
        <OxText style={{ color: colors.inkMuted, fontSize: 14 }}>
          Loading review…
        </OxText>
      </SketchCard>
    );
  }

  const existing = state.existingReview;
  const showNewReviewForm = state.canReview && !existing;
  const needsAttendanceConfirm =
    !existing && state.canConfirmAttendance && !state.hasRespondedToAttendance;

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
    setSuccess(null);
    const imageIds =
      imageDrafts.length > 0 ? imageDrafts.map((d) => d.storageId) : undefined;
    try {
      await submitReview({
        listingId: listingId as Id<"listings">,
        nowMs: Date.now(),
        ratings: draft,
        comment: comment || undefined,
        imageIds,
        isAnonymous: postAnonymously,
      });
      setSuccess("Thanks for your review!");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReport() {
    if (!existing) return;
    setSubmitting(true);
    setError(null);
    try {
      await reportReview({
        reviewId: existing.id as Id<"collegeReviews">,
        nowMs: Date.now(),
      });
      setReported(true);
      setSuccess("Thanks — we'll look into it.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit report.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!state.isPast && !existing) {
    return null;
  }

  if (needsAttendanceConfirm) {
    return (
      <ConfirmAttendanceSection listingId={listingId} college={college} />
    );
  }

  return (
    <SketchCard padding={20}>
      <OxText
        style={[
          styles.title,
          { color: colors.ink, fontFamily: FONT_DISPLAY },
        ]}
      >
        Rate this formal
      </OxText>

      {existing && !editing ? (
        <View style={styles.body}>
          <ReviewFormSection title="Ratings" first>
            <View style={styles.ratings}>
              {COLLEGE_REVIEW_CATEGORIES.map((cat) => (
                <StarRating
                  key={cat.key}
                  label={cat.label}
                  value={existing.ratings[cat.key]}
                  size="sm"
                />
              ))}
            </View>
          </ReviewFormSection>
          {existing.comment ? (
            <ReviewFormSection title="Review">
              <OxText
                style={{
                  color: colors.inkMuted,
                  fontSize: 14,
                  fontStyle: "italic",
                }}
              >
                &ldquo;{existing.comment}&rdquo;
              </OxText>
            </ReviewFormSection>
          ) : null}
          {existing.imageUrls && existing.imageUrls.length > 0 ? (
            <ReviewFormSection title="Photos">
              <ReviewImageGallery imageUrls={existing.imageUrls} />
            </ReviewFormSection>
          ) : null}
          <OxText style={{ color: colors.inkSoft, fontSize: 12, marginTop: 16 }}>
            {existing.isAnonymous
              ? "Posted anonymously"
              : existing.author
                ? `${existing.author.name} · ${existing.author.college}`
                : "Your review"}
          </OxText>
          {existing.author?.userId === user?.id || !existing.author ? (
            <OxButton
              title="Edit review"
              variant="secondary"
              onPress={() => setEditing(true)}
              style={{ marginTop: 12, alignSelf: "flex-start" }}
            />
          ) : (
            <OxButton
              title={reported ? "Reported" : "Report review"}
              variant="secondary"
              onPress={() => void handleReport()}
              disabled={reported || submitting}
              style={{ marginTop: 12, alignSelf: "flex-start" }}
            />
          )}
        </View>
      ) : existing && editing ? (
        <View style={styles.body}>
          <CollegeReviewEditor
            review={existing}
            onSaved={() => {
              setEditing(false);
              setSuccess("Review updated.");
            }}
            onCancel={() => {
              setEditing(false);
              setError(null);
            }}
          />
        </View>
      ) : showNewReviewForm ? (
        <View style={styles.body}>
          <ReviewFormSection title="Ratings" first>
            <View style={styles.ratings}>
              {COLLEGE_REVIEW_CATEGORIES.map((cat) => (
                <StarRating
                  key={cat.key}
                  label={cat.label}
                  value={draft[cat.key]}
                  onChange={(n) =>
                    setDraft((prev) => ({ ...prev, [cat.key]: n }))
                  }
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
          <OxButton
            title={submitting ? "Saving…" : "Submit review"}
            onPress={openSubmitConfirm}
            disabled={submitting || !ratingsComplete}
            style={{ marginTop: 16 }}
          />
        </View>
      ) : (
        <OxText style={{ color: colors.inkMuted, fontSize: 14, marginTop: 8 }}>
          {state.reason}
        </OxText>
      )}

      {error ? (
        <OxText style={{ color: colors.danger, fontSize: 14, marginTop: 12 }}>
          {error}
        </OxText>
      ) : null}
      {success ? (
        <OxText style={{ color: colors.inkMuted, fontSize: 14, marginTop: 12 }}>
          {success}
        </OxText>
      ) : null}

      <OxModal
        visible={confirmSubmitOpen}
        onClose={() => setConfirmSubmitOpen(false)}
        title="Submit review?"
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
    </SketchCard>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  body: { marginTop: 16 },
  ratings: { gap: 10 },
  modalActions: { marginTop: 20, gap: 8 },
});
