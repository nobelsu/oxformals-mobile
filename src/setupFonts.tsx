/**
 * Must be the first import in `app/_layout.tsx` so every later `Text` / `TextInput`
 * from `react-native` resolves to the Schoolbell-wrapped components.
 */
import { FONT_DISPLAY } from "@/src/constants/fonts";
import React from "react";
import * as RN from "react-native";

/** Schoolbell is regular-only; a non-400 weight makes iOS/Android fall back to system UI. */
const fontStyle = { fontFamily: FONT_DISPLAY, fontWeight: "400" as const };

function isNonRegularWeight(weight: RN.TextStyle["fontWeight"]): boolean {
  if (weight == null) return false;
  if (weight === "400" || weight === "normal") return false;
  if (typeof weight === "number" && weight === 400) return false;
  return true;
}

function sanitizeStyle(style: RN.TextStyle): RN.TextStyle {
  if (!isNonRegularWeight(style.fontWeight)) return style;
  const { fontWeight: _removed, ...rest } = style;
  return rest;
}

function flattenStyle(
  style: RN.StyleProp<RN.TextStyle>,
): RN.TextStyle[] {
  if (!style) return [];
  if (Array.isArray(style)) {
    return (style as RN.StyleProp<RN.TextStyle>[]).flatMap((s) =>
      flattenStyle(s),
    );
  }
  const flat = RN.StyleSheet.flatten(style);
  return flat ? [sanitizeStyle(flat)] : [];
}

function mergeStyle(style: RN.StyleProp<RN.TextStyle> | undefined) {
  if (!style) return fontStyle;
  return [...flattenStyle(style), fontStyle];
}

const RNText = RN.Text;
const PatchedText = React.forwardRef<
  React.ComponentRef<typeof RNText>,
  React.ComponentProps<typeof RNText>
>(function PatchedText({ style, ...props }, ref) {
  return <RNText ref={ref} style={mergeStyle(style)} {...props} />;
});
PatchedText.displayName = "Text";

const RNTextInput = RN.TextInput;
const PatchedTextInput = React.forwardRef<
  React.ComponentRef<typeof RNTextInput>,
  React.ComponentProps<typeof RNTextInput>
>(function PatchedTextInput({ style, ...props }, ref) {
  return <RNTextInput ref={ref} style={mergeStyle(style)} {...props} />;
});
PatchedTextInput.displayName = "TextInput";

Object.defineProperty(RN, "Text", {
  value: PatchedText,
  writable: true,
  configurable: true,
});
Object.defineProperty(RN, "TextInput", {
  value: PatchedTextInput,
  writable: true,
  configurable: true,
});
