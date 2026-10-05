import { collegeToSlug } from "@/lib/data/collegeSlug";
import { errorMessage } from "@/src/lib/errorMessage";
import { WEB_ORIGIN } from "@/src/lib/webOrigin";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { ActionSheetIOS, Alert, Platform, Share } from "react-native";

/** The things the website draws a story image for. */
export type ShareKind = "listing" | "review";

export type ShareTarget = {
  kind: ShareKind;
  id: string;
  /** Sentence sent along with the link. */
  text: string;
  url: string;
};

/** "Formal at Keble on Fri 9 Oct. Want to come?": the line sent with a listing's link. */
export function listingShareText(listing: { college: string; dateTime: string }): string {
  const day = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(listing.dateTime));
  return `Formal at ${listing.college} on ${day}. Want to come?`;
}

export function listingShareTarget(listing: {
  id: string;
  college: string;
  dateTime: string;
}): ShareTarget {
  return {
    kind: "listing",
    id: listing.id,
    text: listingShareText(listing),
    url: `${WEB_ORIGIN}/?listing=${encodeURIComponent(listing.id)}`,
  };
}

/** Your own review: the link goes to the college's page, as on the website. */
export function reviewShareTarget(reviewId: string, college: string): ShareTarget {
  return {
    kind: "review",
    id: reviewId,
    text: `My verdict on ${college} formal is in`,
    url: `${WEB_ORIGIN}/college/${collegeToSlug(college)}`,
  };
}

/** The system share sheet with the sentence and its link. */
export async function shareLink(target: Pick<ShareTarget, "text" | "url">): Promise<void> {
  await Share.share({ message: `${target.text}\n${target.url}` });
}

/**
 * Download the story image the website draws (1080×1920 PNG) and hand the
 * file to the share sheet, where Instagram offers "Story".
 */
export async function shareToStory(kind: ShareKind, id: string): Promise<void> {
  const file = await File.downloadFileAsync(
    `${WEB_ORIGIN}/api/share/${kind}/${encodeURIComponent(id)}`,
    new File(Paths.cache, `oxformals-${kind}.png`),
    { idempotent: true },
  );
  await Sharing.shareAsync(file.uri, { mimeType: "image/png", UTI: "public.png" });
}

/**
 * "Share link" or "Share to story". `onBusy` brackets the story image's
 * download, which can take a moment.
 */
export function openShareMenu(
  target: ShareTarget,
  onBusy?: (busy: boolean) => void,
): void {
  const link = () => {
    shareLink(target).catch((error) =>
      Alert.alert("Couldn't share", errorMessage(error)),
    );
  };
  const story = () => {
    onBusy?.(true);
    shareToStory(target.kind, target.id)
      .catch((error) => Alert.alert("Couldn't make the image", errorMessage(error)))
      .finally(() => onBusy?.(false));
  };

  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      { options: ["Share link", "Share to story", "Cancel"], cancelButtonIndex: 2 },
      (index) => {
        if (index === 0) link();
        if (index === 1) story();
      },
    );
  } else {
    Alert.alert("Share", undefined, [
      { text: "Share link", onPress: link },
      { text: "Share to story", onPress: story },
      { text: "Cancel", style: "cancel" },
    ]);
  }
}
