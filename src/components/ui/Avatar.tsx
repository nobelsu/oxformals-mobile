import { useOxTheme } from "@/src/contexts/ThemeContext";
import type { AvatarSource } from "@/src/lib/auth/types";
import { seededOffset, STROKE_WIDTH } from "@/src/lib/ui/sketchStroke";
import { useMemo, type ReactNode } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

export const PRESET_AVATARS: Array<{ id: string; label: string }> = [
  { id: "fox", label: "Fox" },
  { id: "bear", label: "Bear" },
  { id: "owl", label: "Owl" },
  { id: "rose", label: "Rose" },
  { id: "star", label: "Star" },
  { id: "wave", label: "Wave" },
  { id: "leaf", label: "Leaf" },
  { id: "moon", label: "Moon" },
];

const PRESET_STROKE = {
  fill: "none" as const,
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function PresetIconSvg({
  size,
  children,
}: {
  size: number;
  children: ReactNode;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {children}
    </Svg>
  );
}

export function PresetAvatarIcon({
  id,
  size = 20,
  color,
}: {
  id: string;
  size?: number;
  color?: string;
}) {
  const { colors } = useOxTheme();
  const stroke = color ?? colors.ink;
  const pathProps = { ...PRESET_STROKE, stroke };

  switch (id) {
    case "fox":
      return (
        <PresetIconSvg size={size}>
          <Path d="M6 11 4 6l5 3 3-4 3 4 5-3-2 5v5a6 6 0 0 1-12 0z" {...pathProps} />
          <Path d="M9.5 14h.01M14.5 14h.01M10 17c.5.5 1.2.8 2 .8s1.5-.3 2-.8" {...pathProps} />
        </PresetIconSvg>
      );
    case "bear":
      return (
        <PresetIconSvg size={size}>
          <Path d="M7 11a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5ZM17 11a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" {...pathProps} />
          <Path d="M12 20a7 7 0 0 0 7-7v-1a7 7 0 1 0-14 0v1a7 7 0 0 0 7 7Z" {...pathProps} />
          <Path d="M10 14h4M12 14v2" {...pathProps} />
        </PresetIconSvg>
      );
    case "owl":
      return (
        <PresetIconSvg size={size}>
          <Path d="M7 6v5M17 6v5M5 11a7 7 0 1 0 14 0" {...pathProps} />
          <Circle cx={9.5} cy={12} r={1.5} fill={stroke} stroke={stroke} />
          <Circle cx={14.5} cy={12} r={1.5} fill={stroke} stroke={stroke} />
          <Path d="m12 13.5-1 2h2z" {...pathProps} />
        </PresetIconSvg>
      );
    case "rose":
      return (
        <PresetIconSvg size={size}>
          <Path d="M12 14c3 0 5-2.2 5-4.5S15 5 12 5 7 7.2 7 9.5s2 4.5 5 4.5Z" {...pathProps} />
          <Path d="M12 14v5M9 19h6M10 10c1 .8 3 .8 4 0" {...pathProps} />
        </PresetIconSvg>
      );
    case "star":
      return (
        <PresetIconSvg size={size}>
          <Path d="m12 4 2.3 4.7L20 9.5l-4 3.9.9 5.6L12 16.5 7.1 19l.9-5.6-4-3.9 5.7-.8z" {...pathProps} />
        </PresetIconSvg>
      );
    case "wave":
      return (
        <PresetIconSvg size={size}>
          <Path d="M3 11c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 4 2" {...pathProps} />
          <Path d="M3 15c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 4 2" {...pathProps} />
        </PresetIconSvg>
      );
    case "leaf":
      return (
        <PresetIconSvg size={size}>
          <Path d="M6 14c0-5 4-8 12-8 0 8-3 12-8 12-2.2 0-4-1.8-4-4Z" {...pathProps} />
          <Path d="M8 16c2-2 4-4 8-6" {...pathProps} />
        </PresetIconSvg>
      );
    case "moon":
      return (
        <PresetIconSvg size={size}>
          <Path d="M15 4.5a8 8 0 1 0 4.5 14.5A7 7 0 0 1 15 4.5Z" {...pathProps} />
        </PresetIconSvg>
      );
    default:
      return null;
  }
}

type Props = {
  avatar?: AvatarSource;
  name: string;
  size?: number;
};

function nameSeed(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h) || 5;
}

export function Avatar({ avatar, name, size = 40 }: Props) {
  const { colors } = useOxTheme();
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const seed = nameSeed(name);
  const r = size / 2 - 2;
  const cx = size / 2;
  const cy = size / 2;

  const rings = useMemo(
    () => ({
      r1: r + seededOffset(seed, 0) * 0.8,
      r2: r + 1.5 + seededOffset(seed, 1) * 0.6,
      o1: cx + seededOffset(seed, 2) * 0.5,
      o2: cy + seededOffset(seed, 3) * 0.5,
    }),
    [seed, r, cx, cy],
  );

  const doodleRing = (
    <Svg width={size} height={size} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Circle
        cx={rings.o1}
        cy={rings.o2}
        r={rings.r1}
        fill="none"
        stroke={colors.ink}
        strokeWidth={STROKE_WIDTH}
      />
      <Circle
        cx={cx + seededOffset(seed, 4) * 0.4}
        cy={cy + seededOffset(seed, 5) * 0.4}
        r={rings.r2}
        fill="none"
        stroke={colors.ink}
        strokeWidth={1}
        opacity={0.35}
      />
    </Svg>
  );

  if (avatar?.kind === "image") {
    return (
      <View style={{ width: size, height: size }}>
        {doodleRing}
        <Image
          source={{ uri: avatar.dataUrl }}
          style={{
            width: size - 6,
            height: size - 6,
            borderRadius: (size - 6) / 2,
            margin: 3,
          }}
        />
      </View>
    );
  }

  const presetId =
    avatar?.kind === "preset" &&
    PRESET_AVATARS.some((preset) => preset.id === avatar.id)
      ? avatar.id
      : null;

  return (
    <View style={{ width: size, height: size }}>
      {doodleRing}
      <View
        style={[
          styles.fallback,
          {
            width: size - 6,
            height: size - 6,
            borderRadius: (size - 6) / 2,
            margin: 3,
            backgroundColor: colors.accent,
          },
        ]}
      >
        {presetId ? (
          <PresetAvatarIcon
            id={presetId}
            size={(size - 6) * 0.55}
            color={colors.accentInk}
          />
        ) : (
          <Text style={{ fontSize: (size - 6) * 0.45, color: colors.accentInk }}>
            {initial}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    justifyContent: "center",
  },
});
