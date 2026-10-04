import { v } from "convex/values";

/**
 * Retired: the per-account themes these keys named. The web app no longer
 * reads or writes `users.uiFont` (appearance is a per-device setting now), but
 * the field and validator stay so existing documents and older clients that
 * still send it keep validating.
 */
export const UI_FONT_IDS = [
  "schoolbell",
  "inter",
  "dm_sans",
  "lora",
  "georgia",
  "arial",
  "system_ui",
] as const;

export type UiFontId = (typeof UI_FONT_IDS)[number];

export const DEFAULT_UI_FONT: UiFontId = "schoolbell";

export const uiFontValidator = v.union(
  v.literal("schoolbell"),
  v.literal("inter"),
  v.literal("dm_sans"),
  v.literal("lora"),
  v.literal("georgia"),
  v.literal("arial"),
  v.literal("system_ui"),
);

export const UI_FONT_OPTIONS: { id: UiFontId; label: string }[] = [
  { id: "schoolbell", label: "Warm paper" },
  { id: "inter", label: "Cool slate" },
  { id: "dm_sans", label: "Soft rose" },
  { id: "lora", label: "Library" },
  { id: "georgia", label: "Newsprint" },
  { id: "arial", label: "Clean white" },
  { id: "system_ui", label: "Mint" },
];
