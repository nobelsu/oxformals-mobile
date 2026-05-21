/** Shared layout tokens for consistent screen spacing. */

import { oxText } from "@/src/constants/oxText";
import type { Edge } from "react-native-safe-area-context";
import type { TextStyle } from "react-native";

/** Tab screens: respect notch/status bar; tab bar handles the bottom inset. */
export const TAB_SCREEN_EDGES: Edge[] = ["top", "left", "right"];

/** Top inset for primary tab titles (Discover, Messages, section headers, etc.). */
export const TAB_SCREEN_TITLE_PADDING_TOP = 0;

export const SCREEN_PADDING = 16;

/** Native stack header: horizontal space for OxBackButton + trailing gap (Android). */
export const STACK_HEADER_BACK_RESERVE = 120;

/** Max width for chat bubbles as a fraction of the thread content area. */
export const CHAT_BUBBLE_WIDTH_RATIO = 0.78;

/** Pixel max width for a bubble (list horizontal padding accounted for). */
export function chatBubbleMaxWidth(
  windowWidth: number,
  horizontalPadding = SCREEN_PADDING,
): number {
  const listContentWidth = windowWidth - horizontalPadding * 2;
  return listContentWidth * CHAT_BUBBLE_WIDTH_RATIO;
}
export const SECTION_GAP = 24;
export const CARD_GAP = 12;

/** Visible slice of the next carousel card on History past listings. */
export const CAROUSEL_PEEK = 32;

/** Gap between carousel cards (History past listings). */
export const CAROUSEL_GAP = 12;

/** Extra scroll padding below tab content for wavy tab bar + home indicator. */
export const TAB_SCROLL_EXTRA_BOTTOM = 20;

export const DISPLAY_HERO = 48;
export const DISPLAY_SECTION = 26;
export const DOODLE_TILT_MAX = 1.2;

/** Uppercase section / tab title typography (Schoolbell + DISPLAY_SECTION). */
export const tabScreenTitleText: TextStyle = {
  ...oxText,
  fontSize: DISPLAY_SECTION,
  textTransform: "uppercase",
};
