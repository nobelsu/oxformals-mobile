import { FONT_DISPLAY } from "@/src/constants/fonts";
import { oxText } from "@/src/constants/oxText";
import {
  StyleSheet,
  Text,
  type StyleProp,
  type TextProps,
  type TextStyle,
} from "react-native";

function stripNonRegularWeight(style: TextStyle): TextStyle {
  const weight = style.fontWeight;
  if (
    weight != null &&
    weight !== "400" &&
    weight !== "normal" &&
    !(typeof weight === "number" && weight === 400)
  ) {
    const { fontWeight: _removed, ...rest } = style;
    return rest;
  }
  return style;
}

/** Schoolbell body text — always sets fontFamily; strips bold weights that fall back to system UI. */
export function OxText({ style, ...props }: TextProps) {
  const flat = style != null ? StyleSheet.flatten(style) : undefined;
  const safe = flat ? stripNonRegularWeight(flat) : undefined;
  return (
    <Text
      style={[oxText, safe, { fontFamily: FONT_DISPLAY, fontWeight: "400" }]}
      {...props}
    />
  );
}

export type { StyleProp, TextProps, TextStyle };
