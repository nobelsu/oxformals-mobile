import type { UiFontId } from "@/src/lib/uiFont";

export type OxColors = {
  bg: string;
  paper: string;
  ink: string;
  inkMuted: string;
  inkSoft: string;
  tag: string;
  tagInk: string;
  accent: string;
  accentHover: string;
  accentInk: string;
  danger: string;
};

const LIGHT_THEMES: Record<UiFontId, OxColors> = {
  schoolbell: {
    bg: "#f2ead8",
    paper: "#f6efe0",
    ink: "#1a140f",
    inkMuted: "#5a4d40",
    inkSoft: "#9a8c7a",
    tag: "#20140d",
    tagInk: "#f6efe0",
    accent: "#edbfba",
    accentHover: "#e3a9a2",
    accentInk: "#1a140f",
    danger: "#c96360",
  },
  inter: {
    bg: "#eef2f7",
    paper: "#f7f9fc",
    ink: "#0f172a",
    inkMuted: "#475569",
    inkSoft: "#94a3b8",
    tag: "#1e293b",
    tagInk: "#f1f5f9",
    accent: "#3b82f6",
    accentHover: "#2563eb",
    accentInk: "#ffffff",
    danger: "#dc2626",
  },
  dm_sans: {
    bg: "#faf5f5",
    paper: "#fff9f9",
    ink: "#2d1f1f",
    inkMuted: "#6b5252",
    inkSoft: "#a89090",
    tag: "#2d1f1f",
    tagInk: "#fff9f9",
    accent: "#e8a4a4",
    accentHover: "#d98a8a",
    accentInk: "#2d1f1f",
    danger: "#c96360",
  },
  lora: {
    bg: "#f5f0e8",
    paper: "#faf6ef",
    ink: "#2c2416",
    inkMuted: "#5c4f3a",
    inkSoft: "#9a8b72",
    tag: "#2c2416",
    tagInk: "#faf6ef",
    accent: "#c4a574",
    accentHover: "#b08f5e",
    accentInk: "#2c2416",
    danger: "#b85450",
  },
  georgia: {
    bg: "#f4f4f0",
    paper: "#fafaf6",
    ink: "#1a1a1a",
    inkMuted: "#4a4a4a",
    inkSoft: "#8a8a8a",
    tag: "#1a1a1a",
    tagInk: "#fafaf6",
    accent: "#4a4a4a",
    accentHover: "#333333",
    accentInk: "#ffffff",
    danger: "#c96360",
  },
  arial: {
    bg: "#ffffff",
    paper: "#f8f8f8",
    ink: "#111111",
    inkMuted: "#444444",
    inkSoft: "#888888",
    tag: "#111111",
    tagInk: "#ffffff",
    accent: "#0066cc",
    accentHover: "#0052a3",
    accentInk: "#ffffff",
    danger: "#cc3333",
  },
  system_ui: {
    bg: "#eef7f4",
    paper: "#f5faf8",
    ink: "#0f2922",
    inkMuted: "#3d5c52",
    inkSoft: "#7a9a8f",
    tag: "#0f2922",
    tagInk: "#f5faf8",
    accent: "#5cb88a",
    accentHover: "#4aa378",
    accentInk: "#0f2922",
    danger: "#c96360",
  },
};

const DARK_THEMES: Record<UiFontId, OxColors> = {
  schoolbell: {
    bg: "#1a140f",
    paper: "#241b14",
    ink: "#f2ead8",
    inkMuted: "#c9bfb1",
    inkSoft: "#8a7d70",
    tag: "#f2ead8",
    tagInk: "#1a140f",
    accent: "#edbfba",
    accentHover: "#e3a9a2",
    accentInk: "#1a140f",
    danger: "#e07a77",
  },
  inter: {
    bg: "#0f172a",
    paper: "#1e293b",
    ink: "#f1f5f9",
    inkMuted: "#94a3b8",
    inkSoft: "#64748b",
    tag: "#f1f5f9",
    tagInk: "#0f172a",
    accent: "#3b82f6",
    accentHover: "#60a5fa",
    accentInk: "#ffffff",
    danger: "#f87171",
  },
  dm_sans: {
    bg: "#1f1414",
    paper: "#2a1c1c",
    ink: "#faf5f5",
    inkMuted: "#c9b0b0",
    inkSoft: "#8a7070",
    tag: "#faf5f5",
    tagInk: "#1f1414",
    accent: "#e8a4a4",
    accentHover: "#f0b8b8",
    accentInk: "#1f1414",
    danger: "#e07a77",
  },
  lora: {
    bg: "#1c1610",
    paper: "#262018",
    ink: "#f5f0e8",
    inkMuted: "#c9bfb1",
    inkSoft: "#8a7d70",
    tag: "#f5f0e8",
    tagInk: "#1c1610",
    accent: "#c4a574",
    accentHover: "#d4b888",
    accentInk: "#1c1610",
    danger: "#e07a77",
  },
  georgia: {
    bg: "#1a1a1a",
    paper: "#262626",
    ink: "#f4f4f0",
    inkMuted: "#b0b0b0",
    inkSoft: "#707070",
    tag: "#f4f4f0",
    tagInk: "#1a1a1a",
    accent: "#888888",
    accentHover: "#aaaaaa",
    accentInk: "#1a1a1a",
    danger: "#e07a77",
  },
  arial: {
    bg: "#111111",
    paper: "#1a1a1a",
    ink: "#ffffff",
    inkMuted: "#cccccc",
    inkSoft: "#888888",
    tag: "#ffffff",
    tagInk: "#111111",
    accent: "#4d9fff",
    accentHover: "#80b8ff",
    accentInk: "#111111",
    danger: "#ff6666",
  },
  system_ui: {
    bg: "#0f2922",
    paper: "#1a3d32",
    ink: "#eef7f4",
    inkMuted: "#a8cfc0",
    inkSoft: "#6a9a88",
    tag: "#eef7f4",
    tagInk: "#0f2922",
    accent: "#5cb88a",
    accentHover: "#7dcca8",
    accentInk: "#0f2922",
    danger: "#e07a77",
  },
};

export function getOxColors(uiFont: UiFontId, colorScheme: "light" | "dark"): OxColors {
  return colorScheme === "dark" ? DARK_THEMES[uiFont] : LIGHT_THEMES[uiFont];
}

export { FONT_DISPLAY as DISPLAY_FONT } from "./fonts";
