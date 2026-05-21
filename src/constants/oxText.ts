import { FONT_DISPLAY } from "@/src/constants/fonts";

/** Schoolbell-only; do not use fontWeight > 400 or the platform falls back to system UI. */
export const oxText = {
  fontFamily: FONT_DISPLAY,
  fontWeight: "400" as const,
};
