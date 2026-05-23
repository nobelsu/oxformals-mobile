import { DoodleOutline } from "@/src/components/ui/DoodleOutline";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { Pressable, StyleSheet, Text } from "react-native";

type Props = {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
};

function chipSeed(label: string): number {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) | 0;
  return Math.abs(h) || 2;
}

export function Chip({ label, selected, disabled, onPress }: Props) {
  const { colors } = useOxTheme();
  const seed = chipSeed(label);

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={[styles.wrap, disabled && styles.disabled]}
    >
      <DoodleOutline
        seed={seed}
        fill={selected ? colors.accent : colors.bg}
        stroke={selected ? colors.accent : colors.ink}
        dashed={false}
        contentStyle={styles.inner}
      >
        <Text
          style={{
            color: selected ? colors.accentInk : colors.ink,
            fontSize: 15,
            fontFamily: FONT_DISPLAY,
          }}
        >
          {label}
        </Text>
      </DoodleOutline>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginRight: 8,
    marginBottom: 8,
  },
  disabled: {
    opacity: 0.4,
  },
  inner: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
