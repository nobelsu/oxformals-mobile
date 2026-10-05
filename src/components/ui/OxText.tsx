import { FONT_DISPLAY } from "@/src/constants/fonts";
import { oxText } from "@/src/constants/oxText";
import { Children, type ReactNode } from "react";
import {
  Platform,
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

/**
 * Schoolbell's 1 and 5 read as I and S ("£15" looks like "£IS"), so runs of
 * digits are set in the system's rounded face instead.
 */
const NUMERAL_FONT = Platform.select({ ios: "ui-rounded", default: "sans-serif" });
const DIGIT_RUN = /(\d[\d.,:]*)/;

function withClearNumerals(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child !== "string" && typeof child !== "number") return child;
    const text = String(child);
    if (!/\d/.test(text)) return text;
    return text.split(DIGIT_RUN).map((part, i) =>
      i % 2 === 1 ? (
        <Text key={i} style={styles.numeral}>
          {part}
        </Text>
      ) : (
        part
      ),
    );
  });
}

/** Schoolbell body text — always sets fontFamily; strips bold weights that fall back to system UI. */
export function OxText({ style, children, ...props }: TextProps) {
  const flat = style != null ? StyleSheet.flatten(style) : undefined;
  const safe = flat ? stripNonRegularWeight(flat) : undefined;
  return (
    <Text
      style={[oxText, safe, { fontFamily: FONT_DISPLAY, fontWeight: "400" }]}
      {...props}
    >
      {withClearNumerals(children)}
    </Text>
  );
}

const styles = StyleSheet.create({
  numeral: { fontFamily: NUMERAL_FONT, fontWeight: "500" },
});

export type { StyleProp, TextProps, TextStyle };
