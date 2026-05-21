import { useInOxModal } from "@/src/components/ui/OxModalContext";
import { DoodleOutline } from "@/src/components/ui/DoodleOutline";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { space, TAP_MIN } from "@/src/constants/spacing";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import {
  forwardRef,
  useState,
  type ComponentProps,
  type Ref,
} from "react";
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import type { TextInput as GestureTextInput } from "react-native-gesture-handler";

type Props = TextInputProps & {
  seed?: number;
  /** Renders inside AuthFormBlock — no separate border. */
  bare?: boolean;
  /** Stroke color when focused (defaults to ink). */
  focusStroke?: string;
  /** Notified when focus changes. */
  onFocusChange?: (focused: boolean) => void;
  /** Layout on the doodle wrapper only (not the TextInput). */
  wrapperStyle?: StyleProp<ViewStyle>;
  /** Shorter height for dense rows (e.g. chat composer). */
  compact?: boolean;
};

function inputSeed(placeholder?: string): number {
  const s = placeholder ?? "input";
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) || 3;
}

type SheetInputRef = ComponentProps<typeof BottomSheetTextInput>["ref"];

export const OxInput = forwardRef<TextInput | GestureTextInput, Props>(
  function OxInput(
  {
    seed: seedProp,
    style,
    wrapperStyle,
    compact,
    bare,
    focusStroke,
    onFocusChange,
    onFocus,
    onBlur,
    cursorColor: _cursorColor,
    selectionColor: _selectionColor,
    ...props
  },
  ref,
) {
  const { colors } = useOxTheme();
  const inBottomSheet = useInOxModal();
  const [focused, setFocused] = useState(false);
  const seed = seedProp ?? inputSeed(
    typeof props.placeholder === "string" ? props.placeholder : undefined,
  );
  const stroke = focused ? (focusStroke ?? colors.ink) : colors.ink;
  const selectionColor = focusStroke ?? colors.accent;
  const caretColor = focused ? selectionColor : colors.ink;

  const inputProps = {
    placeholderTextColor: colors.inkSoft,
    ...props,
    cursorColor: caretColor,
    selectionColor,
    onFocus: (e: Parameters<NonNullable<TextInputProps["onFocus"]>>[0]) => {
      setFocused(true);
      onFocusChange?.(true);
      onFocus?.(e);
    },
    onBlur: (e: Parameters<NonNullable<TextInputProps["onBlur"]>>[0]) => {
      setFocused(false);
      onFocusChange?.(false);
      onBlur?.(e);
    },
      style: [
      styles.input,
      bare ? styles.inputBare : undefined,
      compact ? styles.inputCompact : undefined,
      { color: colors.ink },
      style,
    ],
  };

  const field = inBottomSheet ? (
    <BottomSheetTextInput
      ref={ref as SheetInputRef}
      {...inputProps}
    />
  ) : (
    <TextInput ref={ref as Ref<TextInput>} {...inputProps} />
  );

  if (bare) {
    return <View style={styles.bareWrap}>{field}</View>;
  }

  return (
    <DoodleOutline
      seed={seed}
      fill={colors.paper}
      stroke={stroke}
      dashed={!focused}
      focused={focused}
      elevated={focused}
      style={wrapperStyle}
      contentStyle={[styles.inner, compact ? styles.innerCompact : undefined]}
    >
      {field}
    </DoodleOutline>
  );
  },
);

const styles = StyleSheet.create({
  bareWrap: {
    minHeight: TAP_MIN,
    justifyContent: "center",
  },
  inner: {
    minHeight: TAP_MIN,
    justifyContent: "center",
  },
  innerCompact: {
    minHeight: 44,
  },
  input: {
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    fontSize: 17,
    fontFamily: FONT_DISPLAY,
    letterSpacing: 0,
    width: "100%",
  },
  inputBare: {
    paddingHorizontal: space[2],
    paddingVertical: space[2],
    fontSize: 17,
  },
  inputCompact: {
    paddingVertical: space[1],
    fontSize: 16,
  },
});
