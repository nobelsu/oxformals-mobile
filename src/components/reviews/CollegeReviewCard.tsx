import { CollegeReviewEditor } from "@/src/components/reviews/CollegeReviewEditor";
import { ReviewImageGallery } from "@/src/components/reviews/ReviewImageGallery";
import { StarRating } from "@/src/components/reviews/StarRating";
import { useAuth } from "@/src/components/auth/useAuth";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxText } from "@/src/components/ui/OxText";
import { SketchCard } from "@/src/components/ui/SketchCard";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { openProfile } from "@/src/lib/profile/navigation";
import { formatListingDate } from "@/src/lib/data/format";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  applyVoteToggle,
  COLLEGE_REVIEW_CATEGORIES,
  type CollegeReviewPublic,
  type CollegeReviewVoteState,
} from "@/lib/data/collegeReviews";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

type Props = {
  review: CollegeReviewPublic;
  variant?: "default" | "profile";
};

export function CollegeReviewCard({ review, variant = "default" }: Props) {
  const router = useRouter();
  const { colors } = useOxTheme();
  const [ratingsExpanded, setRatingsExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [optimisticVote, setOptimisticVote] =
    useState<CollegeReviewVoteState | null>(null);
  const { isAuthenticated, user } = useAuth();
  const voteReview = useMutation(api.collegeReviews.voteReview);

  const isOwnReview =
    isAuthenticated && user !== null && review.author?.userId === user.id;
  const canVote = isAuthenticated && !isOwnReview;

  const serverVote: CollegeReviewVoteState = {
    voteScore: review.voteScore,
    viewerVote: review.viewerVote,
  };
  const voteState =
    optimisticVote &&
    (optimisticVote.voteScore !== serverVote.voteScore ||
      optimisticVote.viewerVote !== serverVote.viewerVote)
      ? optimisticVote
      : serverVote;

  function handleVote(direction: "up" | "down") {
    if (!canVote) return;
    const previous = optimisticVote;
    const next = applyVoteToggle(voteState, direction);
    setOptimisticVote(next);
    void voteReview({
      reviewId: review.id as Id<"collegeReviews">,
      direction,
      nowMs: Date.now(),
    }).catch(() => {
      setOptimisticVote(previous);
    });
  }

  return (
    <SketchCard padding={20}>
      <View style={styles.header}>
        {variant === "profile" ? (
          <OxText
            style={[
              styles.collegeTitle,
              { color: colors.ink, fontFamily: FONT_DISPLAY },
            ]}
          >
            {review.college}
          </OxText>
        ) : review.author ? (
          <Pressable
            onPress={() =>
              openProfile(router, review.author!.userId, user?.id)
            }
          >
            <OxText style={{ color: colors.ink, fontSize: 14 }}>
              {review.author.name}
              {review.author.college ? ` · ${review.author.college}` : ""}
            </OxText>
          </Pressable>
        ) : (
          <OxText style={{ color: colors.inkSoft, fontSize: 14 }}>
            Anonymous
          </OxText>
        )}
        <OxText style={{ color: colors.inkMuted, fontSize: 14 }}>
          {formatListingDate(review.formalDateTime)}
        </OxText>
      </View>

      {editing ? (
        <View style={styles.body}>
          <CollegeReviewEditor
            review={review}
            onSaved={() => setEditing(false)}
            onCancel={() => setEditing(false)}
          />
        </View>
      ) : (
        <>
          <Pressable
            onPress={() => setRatingsExpanded((v) => !v)}
            style={styles.ratingsToggle}
            accessibilityRole="button"
            accessibilityState={{ expanded: ratingsExpanded }}
          >
            <OxText style={{ color: colors.inkMuted, fontSize: 12 }}>
              Ratings {ratingsExpanded ? "▲" : "▼"}
            </OxText>
          </Pressable>
          {ratingsExpanded ? (
            <View style={styles.ratings}>
              {COLLEGE_REVIEW_CATEGORIES.map((cat) => (
                <StarRating
                  key={cat.key}
                  label={cat.label}
                  value={review.ratings[cat.key]}
                  size="sm"
                />
              ))}
            </View>
          ) : null}

          {review.comment ? (
            <OxText
              style={[
                styles.comment,
                { color: colors.inkMuted, fontStyle: "italic" },
              ]}
            >
              &ldquo;{review.comment}&rdquo;
            </OxText>
          ) : null}

          {review.imageUrls && review.imageUrls.length > 0 ? (
            <ReviewImageGallery imageUrls={review.imageUrls} />
          ) : null}

          {isOwnReview ? (
            <OxButton
              title="Edit review"
              variant="secondary"
              onPress={() => setEditing(true)}
              style={{ marginTop: 16, alignSelf: "flex-start" }}
            />
          ) : null}
        </>
      )}

      {!isOwnReview && !editing ? (
        <View style={styles.votes}>
          <Pressable
            onPress={() => handleVote("up")}
            disabled={!canVote}
            style={[
              styles.voteBtn,
              { borderColor: colors.ink },
              voteState.viewerVote === 1 && {
                backgroundColor: colors.ink,
              },
            ]}
            accessibilityLabel="Upvote review"
          >
            <OxText
              style={{
                color:
                  voteState.viewerVote === 1 ? colors.bg : colors.ink,
              }}
            >
              ▲
            </OxText>
          </Pressable>
          <OxText style={{ fontSize: 14, fontWeight: "500", minWidth: 24, textAlign: "center" }}>
            {voteState.voteScore}
          </OxText>
          <Pressable
            onPress={() => handleVote("down")}
            disabled={!canVote}
            style={[
              styles.voteBtn,
              { borderColor: colors.ink },
              voteState.viewerVote === -1 && {
                backgroundColor: colors.ink,
              },
            ]}
            accessibilityLabel="Downvote review"
          >
            <OxText
              style={{
                color:
                  voteState.viewerVote === -1 ? colors.bg : colors.ink,
              }}
            >
              ▼
            </OxText>
          </Pressable>
        </View>
      ) : null}
    </SketchCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 8,
  },
  collegeTitle: {
    fontSize: 18,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    flex: 1,
  },
  body: { marginTop: 12 },
  ratingsToggle: { marginTop: 12, paddingVertical: 4 },
  ratings: { marginTop: 8, gap: 8 },
  comment: { fontSize: 14, marginTop: 12, lineHeight: 20 },
  votes: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
  },
  voteBtn: {
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
