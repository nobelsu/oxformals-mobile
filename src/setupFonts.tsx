/**
 * Must be the first import in `app/_layout.tsx` so every later `Text` / `TextInput`
 * from `react-native` resolves to the Schoolbell-wrapped components.
 */
import { FONT_DISPLAY } from "@/src/constants/fonts";
import React from "react";
import * as RN from "react-native";

const fontStyle = { fontFamily: FONT_DISPLAY };

function mergeStyle(style: RN.StyleProp<RN.TextStyle> | undefined) {
  return style ? (Array.isArray(style) ? [fontStyle, ...style] : [fontStyle, style]) : fontStyle;
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
